async function checkAdminAuthentication() {
  try {
    const response = await fetch('/api/check-auth');
    const data = await response.json();

    if (!data.isAuthenticated) {
      window.location.href = '/';
    } else if (data.user.role !== 'admin') {
      document.getElementById('register-form').style.display = 'none';
      document.getElementById('addUserHeader').style.display = 'none';
      document.getElementById('announcement-form').style.display = 'block';
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
  }
}

// Call the function after getUsers and displayUsers have been executed
getUsers().then(() => {
  checkAdminAuthentication();
});

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
    getUsers();
  });

async function getUsers() {
  try {
    const response = await fetch('/api/users', {
      method: 'GET',
      credentials: 'same-origin',
    });
    if (response.ok) {
      const data = await response.json();
      const users = data.users;
      const role = data.role;
      displayUsers(users, role);
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
      getUsers();
    } else {
      console.error('Error deleting user:', response.statusText);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

function displayUsers(users, role) {
  const tbody = document.getElementById('users-table').querySelector('tbody');
  tbody.innerHTML = ''; // Clear the table

  console.log(users);

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

    const roleCell = document.createElement('td');
    roleCell.textContent = user.role;
    row.appendChild(roleCell);

    // Add the delete button to the row if the authenticated user is an admin
    if (role === 'admin') {
      const deleteCell = document.createElement('td');
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.classList.add('btn', 'btn-danger', 'delete-user'); // Add Bootstrap classes
      deleteButton.dataset.userId = user.id; // Add the user ID to the dataset
      deleteButton.addEventListener('click', () => {
        deleteUser(user.id);
      });
      deleteCell.appendChild(deleteButton);
      row.appendChild(deleteCell);
    }

    tbody.appendChild(row);
  });
}
