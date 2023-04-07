async function checkAdminForAnnouncements() {
  try {
    const response = await fetch('/api/check-auth');
    const data = await response.json();

    if (data.isAuthenticated && data.user.role === 'admin') {
      document.getElementById('announcement-form').style.display = 'block';
    } else {
      document.getElementById('announcement-form').style.display = 'none';
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
  }
}

checkAdminForAnnouncements();

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
        // Optionally, you can clear the form fields after successful submission
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

function displayAnnouncements(announcements, role) {
  const list = document.getElementById('announcement-list');
  list.innerHTML = '';

  announcements.forEach((announcement) => {
    // Create the Bootstrap card structure
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

    const date = document.createElement('h6');
    date.textContent = `Posted on: ${new Date(
      announcement.created_at
    ).toLocaleDateString()}`;
    date.classList.add('announcement-date', 'text-muted');
    cardBody.appendChild(date);

    const content = document.createElement('h5');
    content.textContent = announcement.message;
    content.classList.add('announcement-content', 'card-text');
    cardBody.appendChild(content);

    card.appendChild(cardBody);
    col.appendChild(card);
    list.appendChild(col);

    if (role === 'admin') {
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
  });
}

// Call the function when the home page loads
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
        let formattedStartTime = startTime.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        let formattedEndTime = endTime.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        timeRange.innerText = `${formattedStartTime} - ${formattedEndTime}`;
        let description = document.createElement('div');
        description.innerText = args.event.extendedProps.description;
        description.style.fontSize = '0.8em';
        let container = document.createElement('div');
        container.appendChild(title);
        container.appendChild(timeRange);
        container.appendChild(description);
        return { domNodes: [container] };
      },

      select: function (info) {
        formMode = 'create'; // Set form mode to create when selecting a date
        const eventForm = document.getElementById('event-form');
        eventForm.style.display = 'block';
        const startStr = new Date(info.startStr).toISOString().slice(0, -8);
        const endStr = new Date(info.endStr).toISOString().slice(0, -8);

        document.getElementById('event-start').value = startStr;
        document.getElementById('event-end').value = endStr;
      },

      eventClick: async function (info) {
        const existingContainer = document.querySelector('.action-container');
        if (existingContainer) {
          existingContainer.remove();
        }

        const container = document.createElement('div');
        container.classList.add('action-container');
        container.style.position = 'absolute';

        const eventRect = info.el.getBoundingClientRect();
        container.style.top = window.scrollY + eventRect.top + 'px';
        container.style.left = eventRect.right + 10 + 'px';

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
          const eventId = info.event.id;

          const eventForm = document.getElementById('event-form');
          eventForm.style.display = 'block';
          document.getElementById('event-title').value = info.event.title;
          document.getElementById('event-description').value =
            info.event.extendedProps.description;
          document.getElementById('event-start').value = info.event.start
            .toISOString()
            .slice(0, -8);
          document.getElementById('event-end').value = info.event.end
            .toISOString()
            .slice(0, -8);
          document.getElementById('event-all-day').checked = info.event.allDay;

          eventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('event-title').value;
            const description =
              document.getElementById('event-description').value;
            const startStr = document.getElementById('event-start').value;
            const endStr = document.getElementById('event-end').value;
            const allDay = document.getElementById('event-all-day').checked;

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
      };

      if (formMode === 'create') {
        try {
          const createdEvent = await addEvent(eventData);
          if (createdEvent) {
            calendar.addEvent(createdEvent);
            eventForm.reset();
            eventForm.style.display = 'none';
            calendar.unselect(); // Unselect the date after creating the event
          } else {
            throw new Error('Error creating event');
          }
        } catch (error) {
          console.error('Error creating event:', error);
        }
      } else if (formMode === 'edit') {
        // Handle event editing (similar to the code in the eventClick function)
      }
    });

    document.getElementById('event-cancel').addEventListener('click', () => {
      eventForm.reset();
      eventForm.style.display = 'none';
      calendar.unselect(); // Unselect the date when the form is canceled
    });
  });
});

async function fetchEvents() {
  try {
    const response = await fetch('/api/events');
    const events = await response.json();
    return events.map((event) => ({
      ...event,
      start: event.start_date,
      end: event.end_date,
      allDay: event.all_day === 1,
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
  };
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
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update event');
    }

    const data = await response.json();
    return {
      ...data,
      start: data.start_date,
      end: data.end_date,
      allDay: data.all_day === 1,
    };
  } catch (error) {
    console.error('Error updating event:', error);
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
