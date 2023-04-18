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
        document.getElementById('announcement-form').style.display = 'block';

        // Update the following line to show "Welcome <username>"
        document.getElementById(
          'user-display'
        ).textContent = `Welcome ${data.user.username}`;
        document.getElementById('user-display').classList.remove('d-none');
        document.getElementById('admin-nav-item').classList.remove('d-none');
      } else {
        document.getElementById('logout-button').classList.add('d-none');
        document.getElementById('login-form').classList.remove('d-none');
        // Add the following line to hide the user's name when not authenticated
        document.getElementById('user-display').classList.add('d-none');
        document.getElementById('admin-nav-item').classList.add('d-none');
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
    }
  }
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
          // Add the following line to hide the user's name on logout
          document.getElementById('user-display').classList.add('d-none');
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

          window.location.href = '/';
        } else {
          console.error('Error during login:', response.statusText);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    });
});

document
  .getElementById('register-form')
  .addEventListener('submit', async (event) => {
    event.preventDefault();

    const usernameInput = document.getElementById('register-username');
    const passwordInput = document.getElementById('register-password');
    const emailInput = document.getElementById('register-email');
    const usernameError = document.getElementById('username-error');
    const emailError = document.getElementById('email-error');

    [usernameInput, emailInput].forEach((input) => {
      input.classList.remove('is-invalid');
    });
    [usernameError, emailError].forEach((error) => {
      error.style.display = 'none';
    });

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: usernameInput.value,
          password: passwordInput.value,
          email: emailInput.value,
        }),
      });

      if (response.ok) {
        alert('Registration successful');

        usernameInput.value = '';
        passwordInput.value = '';
        emailInput.value = '';

        $('#register-modal').modal('hide');
      } else {
        const errorData = await response.json();
        if (errorData.message === 'Username already exists') {
          usernameInput.classList.add('is-invalid');
          usernameError.style.display = 'block';
        } else if (errorData.message === 'Email already exists') {
          emailInput.classList.add('is-invalid');
          emailError.style.display = 'block';
        } else {
          alert('Error during registration: ' + errorData.message);
        }
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });

document.getElementById('register-button').addEventListener('click', () => {
  $('#register-modal').modal('show');
});
