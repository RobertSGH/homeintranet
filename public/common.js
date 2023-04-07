document.addEventListener('DOMContentLoaded', () => {
  function setActiveNavLink() {
    const navLinks = document.querySelectorAll('nav a');
    const currentPage = window.location.pathname;

    navLinks.forEach((link) => {
      if (link.getAttribute('href') === currentPage) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
  setActiveNavLink();

  async function checkAuthentication() {
    try {
      const response = await fetch('/api/check-auth');
      const data = await response.json();

      if (data.isAuthenticated) {
        document.getElementById('logout-button').classList.remove('d-none');
        document.getElementById('login-form').classList.add('d-none');
      } else {
        document.getElementById('logout-button').classList.add('d-none');
        document.getElementById('login-form').classList.remove('d-none');
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
    }
  }
  // Call the function when the page loads
  checkAuthentication();

  document
    .getElementById('logout-button')
    .addEventListener('click', async () => {
      try {
        const response = await fetch('/api/logout', {
          method: 'POST',
        });

        if (response.ok) {
          document.getElementById('logout-button').classList.add('d-none');
          alert('Logout successful');
          window.location.href = '/';
        } else {
          console.error('Error during logout:', response.statusText);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    });

  document
    .getElementById('login-form')
    .addEventListener('submit', async (event) => {
      event.preventDefault();

      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Logged in successfully', data);

          // Redirect to admin page after successful login
          window.location.href = '/';
        } else {
          console.error('Error during login:', response.statusText);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    });
});
