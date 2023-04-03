async function checkAuthentication() {
  try {
    const response = await fetch('/api/check-auth');
    const data = await response.json();

    if (data.isAuthenticated) {
      document.getElementById('logout-button').style.display = 'block';
    } else {
      document.getElementById('logout-button').style.display = 'none';
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
  }
}
checkAuthentication();

// Logout button event listener
document.getElementById('logout-button').addEventListener('click', async () => {
  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
    });

    if (response.ok) {
      document.getElementById('logout-button').style.display = 'none';
      alert('Logout successful');
      window.location.href = '/'; // Redirect to the homepage after successful logout
    } else {
      console.error('Error during logout:', response.statusText);
    }
  } catch (error) {
    console.error('Error:', error);
  }
});
