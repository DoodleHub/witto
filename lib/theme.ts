export const THEME_STORAGE_KEY = "witto-theme";

/** Runs in <head> before paint so an explicit choice never flashes. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
