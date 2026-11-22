package runtime

import "strings"

// ClaudeGatewayBaseURL accepts either the Claude/Anthropic root or a
// dashboard's OpenAI-style /v1 address. Claude Code appends /v1/messages.
// This is presentation/transport normalization; stored settings are untouched.
func ClaudeGatewayBaseURL(raw string) string {
	base := strings.TrimRight(strings.TrimSpace(raw), "/")
	return strings.TrimSuffix(base, "/v1")
}
