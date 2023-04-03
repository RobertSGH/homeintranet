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
        window.location.href = '/admin';
      } else {
        console.error('Error during login:', response.statusText);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });

document.getElementById('logout-button').addEventListener('click', async () => {
  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
    });

    if (response.ok) {
      document.getElementById('logout-button').style.display = 'none';
      alert('Logout successful');
      window.location.href = '/';
    } else {
      console.error('Error during logout:', response.statusText);
    }
  } catch (error) {
    console.error('Error:', error);
  }
});

async function checkAuthentication() {
  try {
    const response = await fetch('/api/check-auth');
    const data = await response.json();

    if (data.isAuthenticated) {
      document.getElementById('logout-button').style.display = 'block';
      document.getElementById('login-button').style.display = 'none';
      document.getElementById('login-username').style.display = 'none';
      document.getElementById('login-password').style.display = 'none';
      document.getElementById('login-username-label').style.display = 'none';
      document.getElementById('login-password-label').style.display = 'none';
    } else {
      document.getElementById('logout-button').style.display = 'none';
      document.getElementById('login-button').style.display = 'block';
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
  }
}
// Call the function when the page loads
checkAuthentication();
