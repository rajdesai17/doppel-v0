import { Outlet } from "react-router-dom";

export function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans antialiased">
      <Outlet />
    </div>
  );
}
