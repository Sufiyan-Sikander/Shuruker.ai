let _flaskBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_FLASK_BASE_URL;
if (!_flaskBase) {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port === '5173')) {
    // running in Vite dev server — keep relative links so navigation stays on :5173
    _flaskBase = '';
  } else {
    _flaskBase = 'http://127.0.0.1:5000';
  }
}

export const flaskBaseUrl = _flaskBase;

export const firebaseConfig = {
  apiKey: 'AIzaSyBSSk5WF7gpbVvjUEDniiZCIN58hx3jzt8',
  authDomain: 'shruker-77fd2.firebaseapp.com',
  projectId: 'shruker-77fd2',
  storageBucket: 'shruker-77fd2.firebasestorage.app',
  messagingSenderId: '370811810935',
  appId: '1:370811810935:web:78f508d53c9c4df47f8272',
};