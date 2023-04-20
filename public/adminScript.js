async function checkAdminAuthentication() {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      console.log('No token found');
      window.location.href = '/';
      return;
    }

    const response = await fetch('/api/check-auth', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (!data.isAuthenticated) {
      window.location.href = '/';
    } else {
      if (data.user.role === 'admin') {
        document.getElementById('register-form').classList.remove('d-none');
        document.getElementById('addUserHeader').classList.remove('d-none');
      } else {
        document.getElementById('announcement-form').style.display = 'block';
      }
      document.getElementById(
        'user-display'
      ).textContent = `Welcome ${data.user.username}`;
      document.getElementById('user-display').classList.remove('d-none');
      document.getElementById('logout-button').classList.remove('d-none');
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
  }
}

getUsers().then(() => {
  checkAdminAuthentication();
});

document
  .getElementById('register-form')
  .addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('register-username');
    const password = document.getElementById('register-password');
    const email = document.getElementById('register-email');
    const role = document.getElementById('register-role');
    const errorMessageElement = document.getElementById(
      'register-error-message'
    );

    const token = localStorage.getItem('token');

    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: username.value,
          password: password.value,
          email: email.value,
          role: role.value,
        }),
      });
      if (response.ok) {
        alert('User successfully added');
        username.value = '';
        password.value = '';
        email.value = '';
        role.value = '';
        errorMessageElement.style.display = 'none';
        getUsers();
      } else {
        const errorData = await response.json();
        errorMessageElement.textContent =
          errorData.message || 'Error during registration';
        errorMessageElement.style.display = 'block';
      }
    } catch (error) {
      errorMessageElement.textContent = 'Error: ' + error.message;
      errorMessageElement.style.display = 'block';
    }
  });

async function getUsers() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('/api/users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
  tbody.innerHTML = '';

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

    if (role === 'admin') {
      const deleteCell = document.createElement('td');
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.classList.add('btn', 'btn-danger', 'delete-user');
      deleteButton.dataset.userId = user.id;
      deleteButton.addEventListener('click', () => {
        deleteUser(user.id);
      });
      deleteCell.appendChild(deleteButton);
      row.appendChild(deleteCell);
    }

    tbody.appendChild(row);
  });
}
