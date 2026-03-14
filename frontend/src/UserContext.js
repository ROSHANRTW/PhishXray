import React, { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw =
        localStorage.getItem("user") || localStorage.getItem("phishxray_user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn("Failed to parse user from localStorage", e);
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("token") || null;
  });

  // Validate token on app load
  useEffect(() => {
    if (token) {
      // Here you could add token validation logic (ping server etc.)
    } else if (user) {
      // If we have user but no token -> clear
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("phishxray_user");
    }
  }, [token]);

  // Sync user + token with localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        localStorage.removeItem("user");
        localStorage.removeItem("phishxray_user");
      }

      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }
    } catch (e) {
      console.warn("UserContext localStorage sync error", e);
    }
  }, [user, token]);

  // Function to set both user and token
  const setUserAndToken = (userData, tokenData) => {
    console.log("Setting user data:", userData);
    // Ensure isAdmin is properly set
    if (userData && typeof userData.isAdmin === 'undefined') {
      // Try to determine isAdmin from token if not in userData
      if (tokenData) {
        try {
          const payload = JSON.parse(atob(tokenData.split('.')[1]));
          userData.isAdmin = payload.isAdmin || false;
        } catch (e) {
          console.log("Could not parse token for isAdmin");
        }
      }
    }
    setUser(userData);
    setToken(tokenData);
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("phishxray_user");
    localStorage.removeItem("token");
  };

  // Check if user is blocked
  const checkIfUserBlocked = async () => {
    if (!token) return false;
    
    try {
      const res = await fetch("/api/auth/check-blocked", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      if (res.status === 403) {
        // User is blocked
        logout();
        alert("Your account has been blocked due to suspicious behavior. Please contact admin for more information.");
        return true;
      }
      
      return false;
    } catch (err) {
      console.error("Error checking user status:", err);
      return false;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        token,
        setToken,
        setUserAndToken,
        logout,
        checkIfUserBlocked,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

// ✅ useUser hook
export function useUser() {
  return useContext(UserContext);
}
