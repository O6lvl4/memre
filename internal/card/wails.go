package card

import (
	"context"

	"github.com/O6lvl4/memre/internal/srs"
)

type WailsHandler struct {
	svc *Service
}

func NewWailsHandler(svc *Service) *WailsHandler { return &WailsHandler{svc: svc} }

func (h *WailsHandler) ListCards(deckID string) ([]Card, error) {
	return h.svc.ListByDeck(context.Background(), deckID)
}

func (h *WailsHandler) CreateCard(in Card) (Card, error) {
	return h.svc.Create(context.Background(), CreateInput{
		ID: in.ID, DeckID: in.DeckID, Question: in.Question, Answer: in.Answer,
	})
}

func (h *WailsHandler) UpdateCard(in Card) (Card, error) {
	return h.svc.Update(context.Background(), UpdateInput{
		ID: in.ID, Question: in.Question, Answer: in.Answer,
	})
}

func (h *WailsHandler) DeleteCard(id string) error {
	return h.svc.Delete(context.Background(), id)
}

// ReviewCard accepts rating as one of "again" | "hard" | "good" | "easy".
func (h *WailsHandler) ReviewCard(cardID string, rating string) (Card, error) {
	return h.svc.Review(context.Background(), cardID, srs.Rating(rating))
}
