import React, { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  const [token, setToken] = useState(null);

  // Validate in-memory auth state
  useEffect(() => {
    if (!token && user) {
      // If we have user but no token -> clear in-memory state
      setUser(null);
    }
  }, [token, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remove legacy persisted auth data (security hardening)
  useEffect(() => {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("phishxray_user");
      localStorage.removeItem("token");
    } catch (e) {
      console.warn("UserContext localStorage cleanup error", e);
    }
  }, []);

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
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("phishxray_user");
      localStorage.removeItem("token");
    } catch (e) {
      console.warn("UserContext localStorage cleanup error", e);
    }
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