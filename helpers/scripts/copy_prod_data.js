var PROD_ADDRESS = 'http://api.grebelife.com'
var DEV_ADDRESS ='localhost' //'ec2-18-216-251-6.us-east-2.compute.amazonaws.com'
var VERSION = '1.5'

const fetch = require("node-fetch");
const mongoose = require('mongoose');

class ApiClient {
	static get(endpoint, headers) {
		return fetch(`${PROD_ADDRESS}${endpoint}`, {
				method: 'GET',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
					...headers,
				},
			})
			.then(response => response.json())
			.then(responseJSON => {
				return responseJSON;
			})
			.catch(err => {
				console.error(err);
			});
	}

	static post(endpoint, headers, body) {
		return fetch(`${PROD_ADDRESS}${endpoint}`, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...headers,
			},
			body: JSON.stringify(body),
		})
		.catch(err => {
			err = err.replace(/</g, '').replace(/>/g, '');
			console.error(err);
		});
	};

	static put(endpoint, headers, body) {
		/**
		 * HACKFIX (Neil): Sending too many notification objects with requests has
		 * returned 413s and crashed the app. Here we're limiting the saved notifications to 30.
		 * This logic doesn't belong client-side, but putting it here should neutralize the bug for now.
		 */
		if (body.notifications) {
			console.log("Trimming notifications...");
			body.notifications = body.notifications.slice(0, 30);
		} else console.log("No notifications being sent");

		return fetch(`${PROD_ADDRESS}${endpoint}`, {
			method: 'PUT',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...headers,
			},
			body: JSON.stringify(body),
		})
		.then(response => {
			return response.json()
		})
		.then(responseJSON => {
			return responseJSON
		})
		.catch(err => {
			err = err.replace(/</g, '').replace(/>/g, '');
			console.error(err);
		});
	}

	static uploadPhoto(endpoint, headers, uri, name, method = 'PUT') {
		let uriParts = uri.split('.');
		let fileType = uriParts[uriParts.length - 1];

		let formData = new FormData();
		formData.append(name, {
			uri,
			name: `${name}.${fileType}`,
			type: `image/${fileType}`,
		});

		return fetch(`${PROD_ADDRESS}${endpoint}`, {
			method: method,
			headers: {
				Accept: 'application/json',
				...headers,
			},
			body: formData,
		})
		.then(response => {
			return response.json();
		})
		.then(responseJSON => responseJSON)
		.catch(err => {
			err = err.replace(/</g, '').replace(/>/g, '');
			console.error(err);
		});
	}

	static delete(endpoint, headers) {
		return fetch(`${PROD_ADDRESS}${endpoint}`, {
			method: 'DELETE',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...headers,
			}
		})
		.catch(err => {
			err = err.replace(/</g, '').replace(/>/g, '');
			console.error(err);
		});;
	}

	static makeCancelable(promise) {
	  let hasCanceled_ = false;

	  const wrappedPromise = new Promise((resolve, reject) => {
	    promise.then(
	      val => hasCanceled_ ? reject({isCanceled: true}) : resolve(val),
	      error => hasCanceled_ ? reject({isCanceled: true}) : reject(error)
	    );
	  });

	  return {
	    promise: wrappedPromise,
	    cancel() {
	      hasCanceled_ = true;
	    },
	  };
	};
}


mongoose.connect('mongodb://'+DEV_ADDRESS+'/grapp-dev');
console.log("Getting user data")
//get all user data
ApiClient.get('/users/', {}).then(users =>{
  require('../../models/User');
  const Usermodel = mongoose.model('User');
  const promises = users.map(data => {
    const user = new Usermodel(data);
    return user.changePassword('password').then(updatedUser => {
      user.save().then(user => {
        user.changePassword('password')
      })
      .catch(err => {
        console.log(`Error saving ${user} ${err}`)
      });
    });
  });
  console.log("Setting user data")
  Promise.all(promises).then(results => {
    console.log("Successfully populated user data")
    console.log("Disconnecting");
    mongoose.disconnect();
  });
});

