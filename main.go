// Memre is the desktop app's entry point.
//
// This file is intentionally tiny: it owns only the embed.FS for the
// pre-built frontend and the call into the composition root, which lives
// in internal/composition. All business logic stays under internal/.
package main

import (
	"embed"
	"log"

	"github.com/O6lvl4/memre/internal/composition"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	if err := composition.Run(assets); err != nil {
		log.Fatal(err)
	}
}
