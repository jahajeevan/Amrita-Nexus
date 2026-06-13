const Storage = (() => {
  const read = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch (error) {
      return fallback;
    }
  };

  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  return { read, write };
})();
