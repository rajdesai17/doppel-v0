import { Outlet } from "react-router-dom";

export function App() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--app-bg)] text-white font-sans antialiased">
      <Outlet />
    </div>
  );
}
