const AppData = (() => {
  const KEYS = {
    session: "amrita_nexus_session",
    bookmarks: "amrita_nexus_bookmarks",
    theme: "amrita_nexus_theme",
    contacts: "amrita_nexus_contacts"
  };

  const getSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem(KEYS.session)) ?? null;
    } catch (error) {
      return null;
    }
  };

  const saveSession = (session) => {
    if (!session) {
      sessionStorage.removeItem(KEYS.session);
      return;
    }
    sessionStorage.setItem(KEYS.session, JSON.stringify(session));
  };

  const getBookmarks = () => Storage.read(KEYS.bookmarks, {});
  const saveBookmarks = (bookmarks) => Storage.write(KEYS.bookmarks, bookmarks);

  const getTheme = () => Storage.read(KEYS.theme, "light");
  const saveTheme = (theme) => Storage.write(KEYS.theme, theme);

  const getContacts = () => Storage.read(KEYS.contacts, []);
  const saveContacts = (contacts) => Storage.write(KEYS.contacts, contacts);

  return {
    KEYS,
    getSession,
    saveSession,
    getBookmarks,
    saveBookmarks,
    getTheme,
    saveTheme,
    getContacts,
    saveContacts
  };
})();
