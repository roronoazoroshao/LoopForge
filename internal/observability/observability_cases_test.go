package observability

import (
	"context"
	"encoding/binary"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"agentflow/internal/domain"
)

func cvSProtoVarint(field int, value uint64) []byte {
	b := []byte{byte(field << 3)}
	return binary.AppendUvarint(b, value)
}

func cvSProtoBytes(field int, value []byte) []byte {
	b := binary.AppendUvarint(nil, uint64(field<<3|2))
	b = binary.AppendUvarint(b, uint64(len(value)))
	return append(b, value...)
}

func cvSProtoFixed64(field int, value uint64) []byte {
	b := binary.AppendUvarint(nil, uint64(field<<3|1))
	return binary.LittleEndian.AppendUint64(b, value)
}

func TestOTLPProtobufAndMalformedFields(t *testing.T) {
	any := cvSProtoBytes(1, []byte("run-pb"))
	kv := append(cvSProtoBytes(1, []byte("agentflow.run_id")), cvSProtoBytes(2, any)...)
	resource := cvSProtoBytes(1, kv)
	status := append(cvSProtoBytes(2, []byte("bad")), cvSProtoVarint(3, 2)...)
	span := cvSProtoBytes(1, []byte{1, 2})
	span = append(span, cvSProtoBytes(2, []byte{3, 4})...)
	span = append(span, cvSProtoBytes(3, []byte{5})...)
	span = append(span, cvSProtoBytes(5, []byte("operation"))...)
	span = append(span, cvSProtoFixed64(7, 1_000_000_000)...)
	span = append(span, cvSProtoFixed64(8, 2_000_000_000)...)
	span = append(span, cvSProtoBytes(9, cvSProtoBytes(1, []byte("empty-value")))...)
	span = append(span, cvSProtoBytes(15, status)...)
	scope := cvSProtoBytes(2, span)
	rs := append(cvSProtoBytes(1, resource), cvSProtoBytes(2, scope)...)
	body := cvSProtoBytes(1, rs)

	events := ParseOTLPTraces(body)
	if len(events) != 1 || events[0].RunID != "run-pb" || events[0].Level != "error" {
		t.Fatalf("protobuf event = %#v", events)
	}
	for _, malformed := range [][]byte{{0x80}, {0x09, 1}, {0x12, 5, 1}, {0x1b}, {0x2d, 1}} {
		if events := ParseOTLPTraces(malformed); len(events) != 0 {
			t.Fatalf("malformed input produced events: %x", malformed)
		}
	}
	if got := anyString([]byte("plain")); got != "plain" {
		t.Fatalf("anyString fallback = %q", got)
	}
}

func TestOTLPValuesAndSpanKinds(t *testing.T) {
	values := kvMap([]otlpKV{
		{Key: "bool", Value: otlpAnyVal{BoolValue: true}},
		{Key: "double", Value: otlpAnyVal{DoubleValue: 2.5}},
		{Key: "int", Value: otlpAnyVal{IntValue: int64(3)}},
		{},
	})
	if values["bool"] != "true" || values["double"] != "2.5" || values["int"] != "3" {
		t.Fatalf("values = %#v", values)
	}
	for _, tc := range []struct {
		v    any
		zero bool
	}{{"1", false}, {float64(2), false}, {int64(3), false}, {"bad", true}, {nil, true}} {
		if unixNano(tc.v).IsZero() != tc.zero {
			t.Fatalf("unixNano(%#v)", tc.v)
		}
	}
	for _, typ := range []string{"tool", "llm", "agent", ""} {
		ev := spanEvent(otlpSpan{Name: "", StartTimeUnixNano: int64(1), EndTimeUnixNano: int64(2)}, map[string]string{"span.type": typ})
		if ev.Name == "" || ev.Message == "" {
			t.Fatalf("event for %q = %#v", typ, ev)
		}
	}
}

func TestHookWatchAndHelpers(t *testing.T) {
	path := filepath.Join(t.TempDir(), "nested", "hooks.ndjson")
	ctx, cancel := context.WithCancel(context.Background())
	got := make(chan string, 2)
	done := make(chan struct{})
	WatchHookFile(ctx, "", func(domain.TelemetryEvent) {})
	WatchHookFile(ctx, path, nil)
	cancel()

	ctx, cancel = context.WithCancel(context.Background())
	done = make(chan struct{})
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	go func() {
		WatchHookFile(ctx, path, func(event domain.TelemetryEvent) { got <- event.Message })
		close(done)
	}()
	if err := os.WriteFile(path, []byte("\nnot-json\n{\"event\":\"Stop\"}\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	select {
	case msg := <-got:
		if !strings.Contains(msg, "stop") {
			t.Fatalf("message = %q", msg)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("watcher did not emit")
	}
	cancel()
	<-done
}

// A writer may append a partial JSON record while the watcher reads EOF.
// Advancing to the file's new size would silently drop the completed event.
func TestDrainHookFileWaitsForCompleteRecord(t *testing.T) {
	path := filepath.Join(t.TempDir(), "hooks.ndjson")
	first := []byte("{\"event\":\"Sto")
	if err := os.WriteFile(path, first, 0o600); err != nil {
		t.Fatal(err)
	}
	var offset int64
	var messages []string
	emit := func(event domain.TelemetryEvent) { messages = append(messages, event.Message) }
	drainHookFile(path, &offset, emit)
	if offset != 0 || len(messages) != 0 {
		t.Fatalf("partial record consumed: offset=%d messages=%v", offset, messages)
	}

	file, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		t.Fatal(err)
	}
	rest := []byte("p\"}\n")
	if _, err := file.Write(rest); err != nil {
		file.Close()
		t.Fatal(err)
	}
	if err := file.Close(); err != nil {
		t.Fatal(err)
	}
	drainHookFile(path, &offset, emit)
	if offset != int64(len(first)+len(rest)) || len(messages) != 1 || !strings.Contains(messages[0], "stop") {
		t.Fatalf("completed record not emitted: offset=%d messages=%v", offset, messages)
	}
	drainHookFile(path, &offset, emit)
	if len(messages) != 1 {
		t.Fatalf("record emitted twice: %v", messages)
	}
}

func TestHookBranches(t *testing.T) {
	for _, raw := range []string{
		`{"hook_event_name":"PreToolUse","tool_name":"","tool_input":{"command":"  go   test "}}`,
		`{"hookEventName":"PostToolUse","toolName":"Read","toolInput":{"path":" x "}}`,
		`{"event":"Unknown","_agentflow_hook_name":"named"}`,
		`{"event":"Stop","_agentflow_hook_id":"h","_agentflow_hook_name":"hook","_agentflow_execution_phase":"finish","_agentflow_exit_code":1,"_agentflow_duration_ms":12}`,
	} {
		if event, ok := HookEvent([]byte(raw)); !ok || event.Message == "" {
			t.Fatalf("HookEvent(%s) = %#v, %v", raw, event, ok)
		}
	}
	if _, ok := HookEvent([]byte("bad")); ok {
		t.Fatal("invalid JSON accepted")
	}
	m := map[string]any{"a": int64(2), "b": 3}
	if n, ok := firstInt64(m, "a"); !ok || n != 2 {
		t.Fatalf("firstInt64 = %d, %v", n, ok)
	}
	if n, ok := firstInt64(m, "b"); !ok || n != 3 {
		t.Fatalf("firstInt64 int = %d, %v", n, ok)
	}
	if got := summarizeHookTool("", nil, nil, true); got != "tool 完成" {
		t.Fatalf("summary = %q", got)
	}
}
