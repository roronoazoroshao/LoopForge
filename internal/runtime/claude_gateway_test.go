package runtime

import "testing"

func TestClaudeGatewayBaseURL(t *testing.T) {
	for _, tc := range []struct {
		input, expected string
	}{
		{"http://localhost:20128/v1", "http://localhost:20128"},
		{" http://localhost:20128/v1/ ", "http://localhost:20128"},
		{"https://gateway.example/anthropic/v1", "https://gateway.example/anthropic"},
		{"https://gateway.example/anthropic", "https://gateway.example/anthropic"},
		{"https://api.anthropic.com", "https://api.anthropic.com"},
		{"", ""},
	} {
		if actual := ClaudeGatewayBaseURL(tc.input); actual != tc.expected {
			t.Errorf("ClaudeGatewayBaseURL(%q) = %q, want %q", tc.input, actual, tc.expected)
		}
	}
}
