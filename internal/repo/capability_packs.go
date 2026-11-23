package repo

import (
 "encoding/json"
 "errors"
 "time"

 "agentflow/internal/domain"
)

// CreateCapabilityRule inserts a new Rule without upsert semantics.
// The database's unique ID constraint prevents races with other writers.
func (r *CatalogRepo) CreateCapabilityRule(v domain.RuleDefinition) error {
 if v.ID == "" || v.Name == "" { return errors.New("rule id and name are required") }
 v.UpdatedAt = time.Now().UTC()
 payload, err := json.Marshal(v)
 if err != nil { return err }
 result := r.DB.Exec("INSERT INTO rules (id, name, payload, updated_at) VALUES (?, ?, ?, ?)",
  v.ID, v.Name, string(payload), v.UpdatedAt)
 if result.Error != nil { return result.Error }
 if result.RowsAffected != 1 { return errors.New("rule was not inserted") }
 return nil
}
