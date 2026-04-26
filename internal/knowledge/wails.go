package knowledge

import "context"

type WailsHandler struct {
	svc *Service
}

func NewWailsHandler(svc *Service) *WailsHandler { return &WailsHandler{svc: svc} }

func (h *WailsHandler) ListByDeck(deckID string) ([]Source, error) {
	return h.svc.ListByDeck(context.Background(), deckID)
}

func (h *WailsHandler) Create(in Source) (Source, error) {
	return h.svc.Create(context.Background(), CreateInput{
		ID: in.ID, DeckID: in.DeckID, Name: in.Name, Content: in.Content, Type: in.Type,
	})
}

func (h *WailsHandler) Update(in Source) (Source, error) {
	return h.svc.Update(context.Background(), UpdateInput{
		ID: in.ID, Name: in.Name, Content: in.Content, Type: in.Type,
	})
}

func (h *WailsHandler) Delete(id string) error {
	return h.svc.Delete(context.Background(), id)
}
