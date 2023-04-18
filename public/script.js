async function getUser() {
  try {
    const response = await fetch('/api/check-auth');
    const data = await response.json();

    console.log(data);
    if (data.isAuthenticated) {
      return data.user;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}
getUser();

document
  .getElementById('announcement-form')
  .addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('announcement-title').value;
    const content = document.getElementById('announcement-content').value;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          created_at: createdAt,
          updated_at: updatedAt,
        }),
      });

      if (response.status === 201) {
        const data = await response.json();
        console.log('Announcement created:', data);
        document.getElementById('announcement-title').value = '';
        document.getElementById('announcement-content').value = '';
      } else {
        const error = await response.json();
        console.error('Error creating announcement:', error);
      }
    } catch (error) {
      console.error('Error submitting announcement:', error);
    }
    fetchAnnouncements();
  });

async function fetchAnnouncements() {
  try {
    const user = await getUser();
    const announcementForm = document.getElementById('announcement-form');
    const loginRegisterMessage = document.getElementById(
      'login-register-message'
    );

    if (user) {
      announcementForm.style.display = 'block';
      loginRegisterMessage.style.display = 'none';
    } else {
      announcementForm.style.display = 'none';
      loginRegisterMessage.style.display = 'block';
    }
    const response = await fetch('/api/announcements');
    const data = await response.json();

    console.log(data);
    if (response.ok) {
      const role = data.role;
      displayAnnouncements(data.announcements, role);
    } else {
      console.error('Error fetching announcements:', response.statusText);
    }
  } catch (error) {
    console.error('Error fetching announcements:', error);
  }
}

function displayAnnouncements(announcements, role, userId) {
  const list = document.getElementById('announcement-list');
  list.innerHTML = '';

  const displayMoreButton = document.createElement('button');
  displayMoreButton.textContent = 'Display More';
  displayMoreButton.classList.add('btn', 'btn-primary', 'mt-3', 'd-none');

  const displayMoreWrapper = document.createElement('div');
  displayMoreWrapper.classList.add('text-center');
  displayMoreWrapper.appendChild(displayMoreButton);

  let displayedAnnouncements = 2;

  function createAnnouncement(announcement) {
    const col = document.createElement('div');
    col.classList.add('col-12', 'mb-4');

    const card = document.createElement('div');
    card.classList.add('card', 'h-100');

    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body');

    const title = document.createElement('h4');
    title.classList.add('card-title');
    title.textContent = announcement.title;
    cardBody.appendChild(title);

    const date = document.createElement('p');
    date.textContent = `Posted on: ${new Date(
      announcement.created_at
    ).toLocaleDateString()}`;
    date.classList.add('announcement-date', 'text-muted');
    cardBody.appendChild(date);

    const content = document.createElement('h5');
    content.textContent = announcement.message;
    content.classList.add('announcement-content', 'card-text');
    cardBody.appendChild(content);

    const username = document.createElement('h6');
    username.textContent = `Posted by: ${announcement.username}`;
    username.classList.add('announcement-username', 'text-muted');
    cardBody.appendChild(username);

    card.appendChild(cardBody);
    col.appendChild(card);

    if (role === 'admin' || announcement.user_id === userId) {
      const cardFooter = document.createElement('div');
      cardFooter.classList.add('card-footer');

      const editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      editButton.classList.add('btn', 'btn-primary', 'mr-2');

      editButton.dataset.announcementId = announcement.id;
      editButton.addEventListener('click', () => {
        openEditForm(announcement);
      });
      cardFooter.appendChild(editButton);

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.classList.add('btn', 'btn-secondary', 'delete-announcement');

      deleteButton.dataset.announcementId = announcement.id;
      deleteButton.onclick = () => deleteAnnouncement(announcement.id);
      cardFooter.appendChild(deleteButton);

      card.appendChild(cardFooter);
    }

    list.appendChild(col);
  }

  if (announcements.length === 0) {
    const noAnnouncementsMessage = document.createElement('p');
    noAnnouncementsMessage.textContent =
      'There are no announcements at the moment.';
    noAnnouncementsMessage.classList.add('text-center');
    list.appendChild(noAnnouncementsMessage);
  } else {
    announcements.slice(0, displayedAnnouncements).forEach(createAnnouncement);

    displayMoreButton.addEventListener('click', () => {
      displayedAnnouncements += 2;
      announcements
        .slice(displayedAnnouncements - 2, displayedAnnouncements)
        .forEach(createAnnouncement);

      if (displayedAnnouncements >= announcements.length) {
        displayMoreButton.classList.add('d-none');
      }
    });

    if (announcements.length > displayedAnnouncements) {
      displayMoreButton.classList.remove('d-none');
    }
  }

  list.appendChild(displayMoreWrapper);
}
fetchAnnouncements();

function openEditForm(announcement) {
  document.getElementById('edit-announcement-id').value = announcement.id;
  document.getElementById('edit-announcement-title').value = announcement.title;
  document.getElementById('edit-announcement-content').value =
    announcement.message;

  document.getElementById('edit-announcement-form').style.display = 'block';
}

async function deleteAnnouncement(id) {
  try {
    const response = await fetch(`/api/announcements/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      const result = await response.json();
      console.log(result);
      fetchAnnouncements();
    } else {
      console.error('Error deleting announcement:', response.statusText);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

document
  .getElementById('edit-announcement-form')
  .addEventListener('submit', async (event) => {
    event.preventDefault();

    const id = document.getElementById('edit-announcement-id').value;
    const title = document.getElementById('edit-announcement-title').value;
    const content = document.getElementById('edit-announcement-content').value;

    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      });

      if (response.ok) {
        alert('Announcement updated');
        fetchAnnouncements();
        document.getElementById('edit-announcement-form').style.display =
          'none';
      } else {
        console.error('Error updating announcement:', response.statusText);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });

document.getElementById('cancel-edit').addEventListener('click', (event) => {
  event.preventDefault();
  document.getElementById('edit-announcement-form').style.display = 'none';
});

document.addEventListener('DOMContentLoaded', function () {
  const calendarEl = document.getElementById('calendar');
  let formMode = '';
  let currentEventId = null;
  let currentEvent = null;

  fetchEvents().then((events) => {
    let calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      events: events,
      selectable: true,
      unselectAuto: false,
      firstDay: 1,
      editable: true,
      eventContent: function (args) {
        let title = document.createElement('div');
        title.innerText = args.event.title;
        let timeRange = document.createElement('div');
        let startTime = args.event.start;
        let endTime = args.event.end;
        let username = document.createElement('div');
        username.innerText = args.event.extendedProps.username;
        username.style.fontSize = '0.8em';
        let formattedStartTime = startTime.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        let formattedEndTime = endTime
          ? endTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })
          : '';

        let timeRangeText = endTime
          ? `${formattedStartTime} - ${formattedEndTime}`
          : formattedStartTime;

        timeRange.innerText = timeRangeText;

        let description = document.createElement('div');
        description.innerText = args.event.extendedProps.description;
        description.style.fontSize = '0.8em';
        let container = document.createElement('div');
        container.appendChild(title);
        container.appendChild(timeRange);
        container.appendChild(description);
        container.appendChild(username);
        return { domNodes: [container] };
      },

      select: async function (info) {
        const user = await getUser();
        if (!user) {
          $('#login-reminder-modal').modal('show');
          return;
        }

        formMode = 'create';
        const eventForm = document.getElementById('event-form');
        eventForm.style.display = 'block';
        const startStr = new Date(info.startStr).toISOString().slice(0, -8);
        const endStr = new Date(info.endStr).toISOString().slice(0, -8);

        document.getElementById('event-start').value = startStr;
        document.getElementById('event-end').value = endStr;

        const calendarRect = calendarEl.getBoundingClientRect();
        const dateRect = info.jsEvent.target.getBoundingClientRect();
        eventForm.style.position = 'absolute';
        eventForm.style.top = `${window.scrollY + dateRect.top}px`;

        const formWidth = eventForm.clientWidth;
        const spaceOnRight = window.innerWidth - dateRect.right;

        if (spaceOnRight < formWidth + 10) {
          eventForm.style.left = `${dateRect.left - formWidth - 10}px`;
        } else {
          eventForm.style.left = `${dateRect.right + 10}px`;
        }
      },

      eventClick: async function (info) {
        const existingContainer = document.querySelector('.action-container');
        if (existingContainer) {
          existingContainer.remove();
        }
        const container = document.createElement('div');
        container.classList.add('action-container');
        container.style.position = 'absolute';
        container.style.width = '165px';
        const eventRect = info.el.getBoundingClientRect();
        container.style.top = window.scrollY + eventRect.top + 'px';
        const containerWidth = parseInt(container.style.width, 10);
        const spaceOnRight = window.innerWidth - eventRect.right;
        if (spaceOnRight < containerWidth + 10) {
          container.style.left = `${eventRect.left - containerWidth - 10}px`;
        } else {
          container.style.left = `${eventRect.right + 10}px`;
        }
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('btn', 'btn-primary', 'btn-sm');
        container.appendChild(editButton);
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('btn', 'btn-danger', 'btn-sm');
        container.appendChild(deleteButton);
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.classList.add('btn', 'btn-secondary', 'btn-sm');
        container.appendChild(cancelButton);
        document.body.appendChild(container);

        editButton.addEventListener('click', async () => {
          formMode = 'edit';
          const eventId = info.event.id;
          currentEventId = eventId;
          currentEvent = info.event;

          const eventForm = document.getElementById('event-form');
          eventForm.style.display = 'block';
          document.getElementById('event-title').value = info.event.title;
          document.getElementById('event-description').value =
            info.event.extendedProps.description;
          document.getElementById('event-start').value = info.event.start
            .toISOString()
            .slice(0, -8);
          document.getElementById('event-end').value = info.event.end
            ? info.event.end.toISOString().slice(0, -8)
            : '';
          document.getElementById('event-all-day').checked = info.event.allDay;

          eventForm.style.position = 'absolute';
          eventForm.style.top = `${window.scrollY + eventRect.top}px`;

          const formWidth = eventForm.clientWidth;
          const spaceOnRight = window.innerWidth - eventRect.right;

          if (spaceOnRight < formWidth + 10) {
            eventForm.style.left = `${eventRect.left - formWidth - 10}px`;
          } else {
            eventForm.style.left = `${eventRect.right + 10}px`;
          }

          eventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('event-title').value;
            const description =
              document.getElementById('event-description').value;
            const startInput = document.getElementById('event-start');
            const endInput = document.getElementById('event-end');
            const allDay = document.getElementById('event-all-day').checked;

            const startStr = allDay
              ? startInput.value.slice(0, 10)
              : startInput.value;

            const endStr = allDay
              ? endInput.value
                ? endInput.value.slice(0, 10)
                : null
              : endInput.value;

            const updatedEvent = {
              title,
              description,
              startStr,
              endStr,
              all_day: allDay,
            };

            try {
              const editedEvent = await editEvent(eventId, updatedEvent);
              if (editedEvent) {
                info.event.setProp('title', title);
                info.event.setExtendedProp('description', description);
                info.event.setDates(startStr, endStr, { allDay });
                eventForm.reset();
                eventForm.style.display = 'none';
              } else {
                throw new Error('Error updating event');
              }
            } catch (error) {
              console.error('Error updating event:', error);
            }
          });

          document
            .getElementById('event-cancel')
            .addEventListener('click', () => {
              eventForm.reset();
              eventForm.style.display = 'none';
            });

          document.body.removeChild(container);
        });

        deleteButton.addEventListener('click', async () => {
          const eventId = info.event.id;
          if (confirm('Are you sure you want to delete this event?')) {
            try {
              const deletedEvent = await deleteEvent(eventId);
              if (deletedEvent) {
                info.event.remove();
              } else {
                throw new Error('Error deleting event');
              }
            } catch (error) {
              console.error('Error deleting event:', error);
            }
          }

          document.body.removeChild(container);
        });

        cancelButton.addEventListener('click', () => {
          document.body.removeChild(container);
        });
      },

      eventDrop: async function (info) {
        const eventId = info.event.id;
        const startStr = info.event.start.toISOString().slice(0, -8);
        const endStr = info.event.end
          ? info.event.end.toISOString().slice(0, -8)
          : null;

        try {
          const updatedEvent = await editEvent(eventId, { startStr, endStr });
          if (!updatedEvent) {
            throw new Error('Error updating event');
          }
        } catch (error) {
          console.error('Error updating event:', error);
          info.revert();
        }
      },
    });

    calendar.render();

    const eventForm = document.getElementById('event-form');

    eventForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const user = await getUser();
      if (!user) {
        console.error('User is not authenticated.');
        return;
      }

      console.log(user);

      const title = document.getElementById('event-title').value;
      const description = document.getElementById('event-description').value;
      const startStr = document.getElementById('event-start').value;
      const endStr = document.getElementById('event-end').value;
      const allDay = document.getElementById('event-all-day').checked;

      const eventData = {
        title,
        description,
        startStr,
        endStr,
        all_day: allDay,
        user_id: user.username,
      };

      if (formMode === 'create') {
        try {
          const createdEvent = await addEvent(eventData);
          console.log(createdEvent);
          if (createdEvent) {
            console.log(createdEvent);
            calendar.addEvent(createdEvent);
            eventForm.reset();
            eventForm.style.display = 'none';
            calendar.unselect();
          } else {
            throw new Error('Error creating event');
          }
        } catch (error) {
          console.error('Error creating event:', error);
        }
      } else if (formMode === 'edit' && currentEventId) {
        const eventId = currentEventId;

        try {
          const editedEvent = await editEvent(eventId, eventData);
          if (editedEvent) {
            currentEvent.setProp('title', title);
            currentEvent.setExtendedProp('description', description);
            currentEvent.setDates(startStr, endStr, { allDay });
            eventForm.reset();
            eventForm.style.display = 'none';
          } else {
            throw new Error('Error updating event');
          }
        } catch (error) {
          console.error('Error updating event:', error);
        }
      }
    });

    document.getElementById('event-cancel').addEventListener('click', () => {
      eventForm.reset();
      eventForm.style.display = 'none';
      calendar.unselect();
    });
  });
});

async function fetchEvents() {
  try {
    const response = await fetch('/api/events');
    const events = await response.json();
    console.log(events);

    return events.map((event) => ({
      ...event,
      start: event.start_date,
      end: event.end_date,
      allDay: event.all_day === 1,
      user_id: event.user_id,
      username: event.user_name,
    }));
  } catch (error) {
    console.error('Error fetching events:', error);
  }
}

async function addEvent(event) {
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...event,
      start_date: event.startStr,
      end_date: event.endStr,
      all_day: event.all_day,
      user_id: event.user_id,
      username: event.user_name,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to add event');
  }

  const data = await response.json();
  return {
    ...data,
    start: data.start_date,
    end: data.end_date,
    allDay: data.all_day === 1,
    user: data.user_id,
    username: data.user_name,
  };
}

async function editEvent(eventId, eventUpdates) {
  try {
    const response = await fetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...eventUpdates,
        start_date: eventUpdates.startStr,
        end_date: eventUpdates.endStr,
        all_day: eventUpdates.all_day,
        user_id: eventUpdates.user_id,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update event');
    }

    const data = await response.json();
    console.log(data);
    return {
      ...data,
      start: data.start_date,
      end: data.end_date,
      allDay: data.all_day === 1,
      user: data.user_id,
    };
  } catch (error) {
    console.error('Error updating event:', error);
  }
}

async function deleteEvent(eventId) {
  try {
    const response = await fetch(`/api/events/${eventId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete event');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting event:', error);
  }
}

async function deleteAllEvents() {
  try {
    const response = await fetch('/api/events', {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete all events');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting all events:', error);
  }
}

// deleteAllEvents()
//   .then(() => {
//     console.log('All events deleted');
//     // Reload the calendar or do any other actions you want to perform after deleting all events
//   })
//   .catch((error) => {
//     console.error('Error while deleting all events:', error);
//   });

const createAdminUser = async (username, email, password) => {
  try {
    const response = await fetch('/api/create-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      throw new Error('Failed to create admin user');
    }

    const data = await response.json();
    console.log('Admin user created:', data);
  } catch (error) {
    console.error('Error creating admin user:', error.message);
  }
};

// Replace these values with the desired username, email, and password for the admin user

// createAdminUser(adminUsername, adminEmail, adminPassword);
