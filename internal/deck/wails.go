package deck

import "context"

// WailsHandler is the JS-facing entrypoint exposed by the Wails runtime.
// It is intentionally a thin adapter — every method translates a Wails
// call to a Service invocation. Lives in the same package as Service so
// the binding generator picks up matching DTO field names without an
// extra projection layer.
type WailsHandler struct {
	svc *Service
}

func NewWailsHandler(svc *Service) *WailsHandler { return &WailsHandler{svc: svc} }

func (h *WailsHandler) ListDecks() ([]WithStats, error) {
	return h.svc.List(context.Background())
}

func (h *WailsHandler) CreateDeck(in Deck) (Deck, error) {
	return h.svc.Create(context.Background(), CreateInput{
		ID: in.ID, Name: in.Name, Color: in.Color,
		Description: in.Description, Level: in.Level,
	})
}

func (h *WailsHandler) UpdateDeck(in Deck) (Deck, error) {
	return h.svc.Update(context.Background(), UpdateInput{
		ID: in.ID, Name: in.Name, Color: in.Color,
		Description: in.Description, Level: in.Level,
	})
}

func (h *WailsHandler) DeleteDeck(id string) error {
	return h.svc.Delete(context.Background(), id)
}
