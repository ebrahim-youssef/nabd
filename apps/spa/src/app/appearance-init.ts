// Inline no-FOUC script for the app document: applies the stored preferences before first
// paint. It is a fixed build-time constant (no user/DOM interpolation), dependency-free, and
// defensive because it is serialized into the initial HTML — a CSP hash/nonce decision for it
// is deferred (NBD-83 leaves CSP out of scope).
export const APPEARANCE_INIT_SCRIPT =
  "try{var d=document.documentElement;if(localStorage.getItem('nabd:theme')==='dark')d.setAttribute('data-theme','dark');if(localStorage.getItem('nabd:mode')==='modern')d.setAttribute('data-mode','modern')}catch(e){}"
