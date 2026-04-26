import App from "../App";
import { AppHeader } from "../components/AppHeader";

export function AppPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader />
      <main>
        <App />
      </main>
    </div>
  );
}
