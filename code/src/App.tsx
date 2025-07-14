import { BrowserRouter as Router, Routes, Route, Link, NavLink } from "react-router-dom";
import Home from "./pages/Home";
import Graph from "./pages/Graph";
import About from "./pages/About";
import Papers from "./pages/Papers";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { useAuth } from "./context/AuthContext";

function Header() {
  const { token, logout } = useAuth();

  return (
    <header className="bg-gray-900 text-gray-200 p-6 flex items-center justify-between shadow-md">
      <div className="flex gap-6">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `hover:text-blue-400 transition font-semibold ${isActive ? 'text-blue-400 underline' : ''}`
          }
        >
          Home
        </NavLink>
        <NavLink
          to="/graph"
          className={({ isActive }) =>
            `hover:text-blue-400 transition font-semibold ${isActive ? 'text-blue-400 underline' : ''}`
          }
        >
          Graph
        </NavLink>
        <NavLink
          to="/papers"
          className={({ isActive }) =>
            `hover:text-blue-400 transition font-semibold ${isActive ? 'text-blue-400 underline' : ''}`
          }
        >
          Papers
        </NavLink>
        <div className="flex gap-6">
          {!token ? (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `hover:text-green-400 transition font-semibold ${isActive ? 'text-green-400 underline' : ''}`
                }
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) =>
                  `hover:text-green-400 transition font-semibold ${isActive ? 'text-green-400 underline' : ''}`
                }
              >
                Register
              </NavLink>
            </>
          ) : (
            <button
              onClick={logout}
              className="hover:text-blue-400 transition font-semibold"
            >
              Sign Out
            </button>
          )}
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `hover:text-blue-400 transition font-semibold ${isActive ? 'text-blue-400 underline' : ''}`
            }
          >
            About
          </NavLink>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Header />
        <div className="flex-grow p-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/graph" element={<Graph />} />
            <Route path="/papers" element={<Papers />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}