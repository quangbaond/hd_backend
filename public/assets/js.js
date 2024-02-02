const loginStorage = localStorage.getItem('login');

if (!loginStorage) {
    window.location.href = '/login.html';
}


