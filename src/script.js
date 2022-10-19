'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//////////////////////////////////////////////////////////////////////////////////

class App {
  #mapEvent;
  #mapZoomLevel = 13;
  #map;
  #workouts = [];

  constructor() {
    // these will be immediately execute as objeect is created
    this.#getPosition();
    form.addEventListener('submit', this.#newWorkOut.bind(this)); // becoz the this keyword will point ot form not class App
    inputType.addEventListener('change', this.#toggleEleveationField);
    containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this));

    this.#getLocalStorage(); 
  }

  getWorkouts() {
    return this.#workouts;
  }

  #getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  #loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this.#showForm.bind(this)); // this is also a eventListener call (by leaflet)
    // Load local storage workout marker
      this.#workouts.forEach(workout => {
        this.#renderWorkoutMarker(workout);
      });
  }

  #showForm(mapE) {
    form.classList.remove('hidden');
    this.#mapEvent = mapE;
    inputDistance.focus(); // focus cursor in the input form
  }

  #hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  #toggleEleveationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  #newWorkOut(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // 1. Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    const coords = [lat, lng];
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;

      // 2. Check if data is valid
      // check if it is a number, positive number
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert(`Input have to be positive numbers!`);
      }
      // create object
      workout = new Running(coords, distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert(`Input have to be positive numbers!`);
      }
      // create object
      workout = new Cycling(coords, distance, duration, elevation);
    }

    // add object to workout array
    this.#workouts.push(workout);
    console.log(this.#workouts);

    // save in local storage
    this.#setLocalStorage();

    //render workout on map as marker
    this.#renderWorkoutMarker(workout);

    //render workout on list
    this.#renderWorkout(workout);

    //hide form and clear input
    this.#hideForm();
  }

  #renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴'} ${workout.description}`
      )
      .openPopup();
  }

  #renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
    `;
    }

    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevation}</span>
          <span class="workout__unit">m</span>
        </div>
      </li> `;
    }

    form.insertAdjacentHTML('afterend', html);
  }
  
  #moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    console.log(workoutEl);

    if(!workoutEl) return;

    const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
    console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true, 
      pan: {
        duration: 1
      }
    });

    workout.click();
  }

  #setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return; 

    this.#workouts = data;
    this.#workouts.forEach(workout => this.#renderWorkout(workout)); 
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); // convention to convert into string
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // []
    this.distance = distance; // km
    this.duration = duration; // min
  }

  _setDescription() {
    // prettier-ignore
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min /km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km / h
    this.speed = this.distance / this.duration;
    return this.speed;
  }
}
const app = new App();
// const run1 = new Running([10, 11], 10, 10, 10);
// const cyc1 = new Cycling([10, 11], 10, 10, 10);
// console.log(run1, cyc1);
let x = 5;
const y = x > 5 ?? x > 6;
console.log(y);