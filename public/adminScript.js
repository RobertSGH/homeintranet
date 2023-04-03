async function checkAdminAuthentication() {
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
      // Redirect to the homepage if the user is not authenticated
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
  }
}
checkAdminAuthentication();

document
  .getElementById('register-form')
  .addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const email = document.getElementById('register-email').value;
    const role = document.getElementById('register-role').value;

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, email, role }),
      });

      if (response.ok) {
        alert('Registration successful');
      } else {
        console.error('Error during registration:', response.statusText);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });

async function getUsers() {
  try {
    const response = await fetch('/api/users', {
      method: 'GET',
      credentials: 'same-origin',
    });
    if (response.ok) {
      const users = await response.json();
      displayUsers(users);
    } else {
      console.error('Error fetching users:', response.statusText);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function deleteUser(id) {
  try {
    const response = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      const result = await response.json();
      console.log(result);
      getUsers(); // Refresh the users list after deleting a user
    } else {
      console.error('Error deleting user:', response.statusText);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

function displayUsers(users) {
  const tbody = document.getElementById('users-table').querySelector('tbody');
  tbody.innerHTML = ''; // Clear the table

  users.forEach((user) => {
    const row = document.createElement('tr');

    const idCell = document.createElement('td');
    idCell.textContent = user.id;
    row.appendChild(idCell);

    const nameCell = document.createElement('td');
    nameCell.textContent = user.username;
    row.appendChild(nameCell);

    const emailCell = document.createElement('td');
    emailCell.textContent = user.email;
    row.appendChild(emailCell);

    // Add the delete button to the row
    const deleteCell = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
      deleteUser(user.id);
    });
    deleteCell.appendChild(deleteButton);
    row.appendChild(deleteCell);

    tbody.appendChild(row);
  });
}
getUsers();

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
