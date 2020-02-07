import Vue from 'vue';
import Vuex from 'vuex';
import router from '../router';
import {VFD} from '../axios/api'
Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        base: 'http://127.0.0.1:8080/',
        backend: "http://appraisal.local/",

        authenticated: false,
        loggedUser: {
            profile: {
              //
            },
            dashboard: {
              entities: null,
              last_promotion: null,
              role: null,
              summary: null,
              dashboard: null,
              history: null
            },
            
            token: "",
            tokenExpires: "",
        },
    },

    mutations: {
        SET_TOKEN(state, payload) { // Assign generated token and expiration date to browser local storage and mutate values in state
            if(payload.reset){ // Only the autoLogin action passes a reset parameter to the payload object, hence in case of page refresh, logged in user's token is gotten back from local storage and reassigned to store state
              state.loggedUser.token =  payload.token,
              state.loggedUser.tokenExpires = payload.expiration
              state.authenticated = true
              state.loggedUser.action = "Page was refreshed"
            }else{ // doLogin has brought in a new user, so set new users token and expiration in local storage and update same in the store state
              localStorage.setItem('vfd_token', payload.token)
              localStorage.setItem('vfd_expiration', payload.expiration)
              //refresh_token = ""
              state.loggedUser.token = payload.token,
              state.loggedUser.tokenExpires = payload.expiration
              state.authenticated = true
            }
        },

        SET_USER: (state, profile) => { // Updates loggedUser state with details of logged in user
            state.loggedUser.profile = profile
        },
        
        SET_DASHBOARD_DATA: (state, data) => {
            state.loggedUser.dashboard = data;
        },

        DESTROY_TOKEN(){ // Destroys localStorage session and unsets all values in loggedUser state
            localStorage.removeItem('vfd_token')
            localStorage.removeItem('vfd_expiration')
        },

        UNSET_DASHBOARD: (state) => { // Updates loggedUser state with details of logged in user
            state.loggedUser = {
                profile: {},
                dashboard: '',
                token: "",
                tokenExpires: "",
            }
        },
    },

    actions: {
        /**
         * Log out the user and destroys token
         */
        logout: (context) => {
            context.dispatch('postData', {address: 'logout'})
            .then(() => {
                // You can add a promise to return a success code saying loggout successfull
                context.commit('DESTROY_TOKEN'); 
                context.commit('UNSET_DASHBOARD');
                router.push('/login');
            })
            .catch(error => {
                //Send an Email to me
                console.log(error);
            })      
        },

        doLogin: (context, payload) => { 
            /**
             * Function for performing the login action
             * Passport authentication requirements, to be passed along side user name and password
             */
            payload.client_secret = "OCTMEA6HUnOCB0MgXcx7EvaMw4VKZ8iCbrGmY4ST",
            payload.client_id = 2,
            payload.grant_type = "password"

            return new Promise((resolve, reject) => {
            VFD.post(context.state.backend+"oauth/token", payload) // API call to laravel passport token generation route
                .then(response => { // if API call for authentication is passed below happens
                    context.commit('SET_TOKEN', {token: response.data.access_token, expiration: response.data.expires_in + Date.now()});
                    
                    context.dispatch('fetchData', {address:'session/clear'})
                    context.dispatch('fetchData', {address:'dashboard'})
                    .then(response=>{
                        context.commit('SET_DASHBOARD', response.data);
                        window.location.href = context.state.base;
                    });               
                   
                })
                .catch(error=>{
                    reject(error.response.data)
                })
            })
        },

        autoLogin: context => { // Used in App.vue to persist user login state in case of page reload
            let token = localStorage.getItem('vfd_token')
            let expiration = localStorage.getItem('vfd_expiration')
      
            if(! token || ! expiration) // check if token and expiration is not set
            {
              context.commit('DESTROY_TOKEN') // Just incase only one of the 2 is set, destroy all of it
              router.push('/login') // then redirect to login
            }
            else
            {
              if(Date.now() > parseInt(expiration)) // if the 2 is set above, then check if the token has expired
              {
                context.commit('DESTROY_TOKEN') // destroy the expired token
                router.push('/login') // then redirect to login
              }
              else
              {
                context.dispatch('fetchData', {address:'dashboard'})
                    .then(response=>{
                        context.commit('SET_TOKEN', {token: token, expiration: expiration, reset: true}) // commit SET_TOKEN to reset token and expiration in state
                        context.commit('SET_DASHBOARD', response.data)
                    })
                    .catch(error => {// If error occurs at any stage of loading the user data during refresh, then..
                        console.log('ERROR FROM AUTOLOGIN loaduser: '+error.response.data) //log error
                        context.commit('DESTROY_TOKEN') // destroy token
                        router.push('/login') // redirect to login
                    })
              }
            }
          },
  
        /**
         *| UNIVERSAL ACTION FOR FETCHing/GETing API DATA 
         */
        fetchData: (context, payload) => {
            // INJECT TOKEN INTO REQUEST
            VFD.interceptors.request.use(function (request) {
                const token = payload.vfd_token ? payload.vfd_token : context.getters.getToken;
                if ( token != null ) {
                    request.headers.Authorization = `Bearer ${token}`;
                }
                return request;
            }, function (error) {
                return Promise.reject(error.response.data);
            });
            
            /**
             * Returning a promise to determine if action is still loading, failed or completed successfully
             */
            return new Promise((resolve, reject) => {
                VFD.get(payload.address)
                    .then(response => {
                        resolve({
                            status:true, 
                            row: Object.keys(response.data).length, 
                            data:response.data
                        })
                    })
                    .catch(error => {
                        if(error.response.data.message === 'Unauthenticated.'){
                            context.commit('DESTROY_TOKEN');
                            context.commit('UNSET_DASHBOARD');
                            router.push('/login')
                        }
                        reject(error.response.data)
                    })
            })
        },

        postData: (context, payload) => {
            /**
             * SETTING REQUEST INTERCEPTOR FOR TOKEN
             **/
            VFD.interceptors.request.use(request => {
                const token = context.getters.getToken;
                if ( token != null ) {
                    request.headers.Authorization = `Bearer ${token}`;
                }
                return request;
              },
              error => {
                return Promise.reject(error.response.data);
              });

            // Returning a promise to determine if action is still loading, failed or completed successfully
            return new Promise((resolve, reject) => {
                VFD.post(payload.address, payload.data, payload.header || null)
                .then(response => {
                    resolve({
                        status:true, 
                        row: Object.keys(response.data).length, 
                        data:response.data
                    })
                })
                .catch(error => {
                    reject(error.response.data)
                })
            })
        },

        toggleBodyClass: (context, payload) => { // Change the body class for this page to "login" for template formating
            const el = document.body;
            if (payload.addRemoveClass === 'addClass') {
                el.classList.add(payload.className);
            } else {
                el.classList.remove(payload.className);
            }
        },
    },

    getters: {
        
        getToken(state){
            let token;
            let expiration;
            if(state.loggedUser.token && state.loggedUser.tokenExpires){
              token = state.loggedUser.token
              expiration = state.loggedUser.tokenExpires
            }else{ // If data in state changes but local storage still has token and expiration then use localstorage to set token and expiration
              token = localStorage.getItem('vfd_token')
              expiration = localStorage.getItem('vfd_expiration')
            }
      
            if(! token || ! expiration) // check if token exists now or return null
            {
              return null
            }
            else
            {
              if(Date.now() > parseInt(expiration)) // check if existing token has expired and return null if true or return true if otherwise
              {
                return null
              }
              else
              {
                return token
              }
            }
        },
          
        isAuth(state){ return state.isAuth; },
        
        getProfile(state){ return state.loggedUser.profile; },

        getDashboardData(state){ return state.loggedUser.dashboard; },
        
        removeComma: () => (val) => {
            let a = parseInt(val.toString().split(",").join('').toString().split("₦").join(''));
            if(isNaN(a)){
                return '';
            }else{
                return a;
            }            
        },
        
        addComma: () => (val) => {
            let parts = val.toString().split(".");
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join(".");
        },

        round: () => (number, decimalPlace = 1) =>{
            let num = parseFloat(number);
            let rounded = Number(Math.round(num+'e'+decimalPlace)+'e-'+decimalPlace);
            return isNaN(rounded) ? '' : rounded;
        }, 

        getInterestRate(state){
            return state.setup.interest_rate;
        },
        
        getSetup(state){
            return state.setup;
        },

        getFileRoot(state){
            return state.fileRoot;
        },
        
        isLoading:()=>(objectContext, btnId='', btnValue=null)=>{
            objectContext.loading = true;
            objectContext.error = null;
            objectContext.success = null;
            if(btnId !== ''){
                document.getElementById(btnId).disabled = true;
                document.getElementById(btnId).style = 'opacity: 0.5';
            }            
            if(btnValue !== null) document.getElementById(btnId).innerHTML = btnValue;
        },

        hasLoaded:()=>(objectContext, btnId='', btnValue=null)=>{ 
            objectContext.loading = false; 
            if(btnId !== ''){
                document.getElementById(btnId).disabled = false;
                document.getElementById(btnId).style = 'opacity: 1';
            }
            if(btnValue !== null) document.getElementById(btnId).innerHTML = btnValue;
        },
        
    }
})