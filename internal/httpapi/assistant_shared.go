package httpapi

import (
	"agentflow/internal/domain"

	"agentflow/internal/repo"
	"bytes"

	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
)

// Storage retains a stable slot; authorization and tool credentials always use
// the caller, never the user who first opened a run conversation.
func assistantStorageOwner(st *repo.Store, id string, fallback int64) int64 {
	if s, ok := st.SharedAssistantSession(id); ok {
		return s.UserID
	}
	if s, ok := st.ProjectAssistantSession(id); ok {
		return s.UserID
	}
	return fallback
}

// conversationScope returns the storage owner and whether the conversation is
// multi-user. SOP run sessions and every conversation bound to a project are
// shared with that project's members; only unbound conversations are private.
func (h *assistantHandlers) conversationScope(c *gin.Context, id, runID, projectID string, userID int64) (int64, bool, error) {
	if s, ok := h.repo.SharedAssistantSession(id); ok {
		r, exists := h.repo.RunState(s.RunID)
		if s.ProjectID == "" || !exists || r.ExecutionContext.ProjectID != s.ProjectID || !h.workbenchProjectAllowed(c, s.ProjectID, userID) {
			return 0, false, fmt.Errorf("无权访问共享 SOP 会话")
		}
		if (runID != "" && runID != s.RunID) || (projectID != "" && projectID != s.ProjectID) {
			return 0, false, fmt.Errorf("会话与 SOP 运行不匹配")
		}
		return s.UserID, true, nil
	}
	if runID != "" {
		return 0, false, fmt.Errorf("请从任务运行打开共享 SOP 会话")
	}
	if s, ok := h.repo.ProjectAssistantSession(id); ok {
		if !h.workbenchProjectAllowed(c, s.ProjectID, userID) {
			return 0, false, errProjectConversationReadOnly
		}
		return s.UserID, true, nil
	}
	return userID, false, nil
}

var errProjectConversationReadOnly = fmt.Errorf("你不是该项目的成员，只能查看这个会话；加入项目后才能继续聊")

// conversationReadScope extends conversationScope for viewing: any signed-in
// user may read an ordinary project conversation by link. Writing, continuing,
// branching and attachments outside the transcript still use conversationScope.
func (h *assistantHandlers) conversationReadScope(c *gin.Context, id string, userID int64) (owner int64, shared, readOnly bool, err error) {
	owner, shared, err = h.conversationScope(c, id, "", "", userID)
	if err == nil {
		return owner, shared, false, nil
	}
	if s, ok := h.repo.ProjectAssistantSession(id); ok {
		return s.UserID, true, true, nil
	}
	return 0, false, false, err
}
func (h *assistantHandlers) runConversation(c *gin.Context) {
	user, ok := h.requestUser(c.Request, true)
	if !ok {
		c.JSON(401, gin.H{"error": "请先登录"})
		return
	}
	r, ok := h.repo.RunState(c.Param("id"))
	if !ok {
		c.JSON(404, gin.H{"error": "运行不存在"})
		return
	}
	project := r.ExecutionContext.ProjectID
	if project == "" {
		c.JSON(403, gin.H{"error": "运行未绑定项目，不能创建共享会话"})
		return
	}
	if !h.workbenchProjectAllowed(c, project, user.ID) {
		c.JSON(403, gin.H{"error": "无权访问项目"})
		return
	}
	title := r.WorkflowSnapshot.Name
	if title == "" {
		title = r.WorkflowID
	}
	target := domain.AssistantExecutionTarget{Pool: r.ExecutionContext.ExecutionMode, RunnerID: r.ExecutionContext.ExecutionRunnerID}
	if target.Pool != domain.ExecutionModeRunner {
		target.Pool = domain.ExecutionModeCloud
	}
	session, err := h.repo.EnsureRunAssistantSession(r.ID, project, title, user.ID, target)
	if err != nil {
		c.JSON(500, gin.H{"error": "读取共享会话失败"})
		return
	}
	c.Header("Cache-Control", "no-store")
	session.IssueID = r.ExecutionContext.IssueID
	c.JSON(200, session)
}
func sharedTranscriptPrefix(old []assistantMessage, next []assistantMessage) bool {
	if len(next) < len(old) {
		return false
	}
	for i, m := range old {
		a, _ := json.Marshal(m)
		b, _ := json.Marshal(next[i])
		if !bytes.Equal(a, b) {
			return false
		}
	}
	return true
}
func assistantRequestApprovalMode(req assistantRequest) string {
	return normalizeAssistantApprovalMode(req.ApprovalMode)
}

// Only presentation language is affected. Technical identifiers, code, and
// platform tool contracts remain unchanged. Unsupported locale values never
// become prompt text, so a client cannot inject instructions via this field.
func assistantResponseLanguageInstruction(language string) string {
	switch language {
	case "vi":
		return "\n\nQUY TẮC NGÔN NGỮ PHẢN HỒI (ưu tiên cao hơn các ví dụ tiếng Trung ở trên): Trả lời người dùng, thông báo tiến độ và phần diễn giải trong message/drafts bằng Tiếng Việt. KHÔNG dịch tên công cụ, tên trường JSON, mã nguồn, lệnh shell, ID, đường dẫn, trích dẫn nguyên văn, log hay dữ liệu gốc. Khi các hướng dẫn cũ yêu cầu thông báo bằng tiếng Trung, hãy thông báo bằng tiếng Việt thay thế. Chỉ đổi ngôn ngữ khi người dùng trực tiếp yêu cầu."
	case "en":
		return "\n\nRESPONSE LANGUAGE (overrides Chinese-language examples above): Write user-facing answers, progress updates and explanations in English. Do not translate tool names, JSON keys, code, shell commands, IDs, paths, verbatim quotes, logs or source data. If an older instruction requests Chinese progress messages, use English instead. Follow an explicit user request to switch language."
	default:
		return ""
	}
}

func assistantWorkspaceSystemPromptForRequest(req assistantRequest) string {
	return assistantWorkspaceSystemPrompt + assistantResponseLanguageInstruction(req.ResponseLanguage)
}

func assistantSystemPromptForRequest(req assistantRequest, mode string) string {
	if req.sopDesigner() {
		return assistantSOPDesignerSystemPrompt + assistantResponseLanguageInstruction(req.ResponseLanguage)
	}
	return withSpaceDeliverable(req, assistantSystemPromptForMode(mode)) + assistantResponseLanguageInstruction(req.ResponseLanguage)
}

// Only approval receipts may update a shared transcript. Existing messages and
// attribution are immutable; the optimistic timestamp prevents stale overwrites.
func sharedReceiptUpdate(old, next domain.AssistantSession, userID int64, name string) error {
	if !next.UpdatedAt.Equal(old.UpdatedAt) {
		return fmt.Errorf("共享会话已更新，请重新打开")
	}
	if len(next.Messages) < len(old.Messages) {
		return fmt.Errorf("不能删除共享会话消息")
	}
	for i, m := range old.Messages {
		n := next.Messages[i]
		if m.Role == "assistant" && n.Content != m.Content {
			var a, b map[string]any
			if json.Unmarshal([]byte(m.Content), &a) != nil || json.Unmarshal([]byte(n.Content), &b) != nil {
				return fmt.Errorf("不能改写共享会话回复")
			}
			scrub := func(v map[string]any) {
				ds, _ := v["drafts"].([]any)
				for _, d := range ds {
					if x, ok := d.(map[string]any); ok {
						delete(x, "saved")
						delete(x, "savedId")
						delete(x, "savedResult")
					}
				}
			}
			scrub(a)
			scrub(b)
			aa, _ := json.Marshal(a)
			bb, _ := json.Marshal(b)
			if !bytes.Equal(aa, bb) {
				return fmt.Errorf("只能记录草稿执行回执")
			}
			n.Content = m.Content
		}
		aa, _ := json.Marshal(m)
		bb, _ := json.Marshal(n)
		if !bytes.Equal(aa, bb) {
			return fmt.Errorf("不能改写共享会话消息")
		}
	}
	for i := len(old.Messages); i < len(next.Messages); i++ {
		m := &next.Messages[i]
		if m.Role != "user" {
			return fmt.Errorf("只能追加用户回执")
		}
		if !bytes.HasPrefix([]byte(m.Content), []byte("已通过 MCP 执行 ")) {
			return fmt.Errorf("请通过发送接口追加讨论")
		}
		m.AuthorID = userID
		m.AuthorName = name
		m.SpeakerName = ""
		m.SpeakerAgentID = ""
		m.Model = ""
		m.Usage = nil
	}
	return nil
}

// Messages carrying a system trigger (retired role follow-ups) may only be
// resent unchanged at their stored position; new turns cannot carry one.
func (h *assistantHandlers) validateAssistantTriggerHistory(ownerID int64, req assistantRequest) error {
	old, _ := h.repo.AssistantSession(ownerID, req.SessionID)
	for i, message := range req.Messages {
		if message.Trigger == "" && message.TriggerID == "" {
			continue
		}
		if i >= len(old.Messages) {
			return fmt.Errorf("不能伪造系统触发标记")
		}
		a, _ := json.Marshal(message)
		b, _ := json.Marshal(old.Messages[i])
		if string(a) != string(b) {
			return fmt.Errorf("不能改写系统触发标记")
		}
	}
	return nil
}
