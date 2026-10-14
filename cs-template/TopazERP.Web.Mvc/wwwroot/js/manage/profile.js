Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        userDetails: {},
        id: null,
        tenantId: null,
        name : '',
        userName : '',
        phoneNumber : '',
        surname : '',
        emailAddress: '',

    },
    validations() {

        return {

            name: {
                required
            },
            userName: {
                required
            },
            surname: {
                required
            },
            emailAddress: {
                required
            },

        }


    },
    methods: {

     
        updateProfile() {

            this.$v.$touch();

            if (this.$v.$invalid) {

                for (let key in Object.keys(this.$v)) {

                    const input = Object.keys(this.$v)[key];

                    if (this.$v[input].$error) {

                        this.$refs[input].focus();

                        break;
                    }

                }

                return;
            }


            this.payload = {};
            this.isLoading = true;
            
            this.payload.name = this.name;
            this.payload.userName = this.userName;
            this.payload.phoneNumber = this.phoneNumber;
            this.payload.emailAddress = this.emailAddress;
            this.payload.surname = this.surname;
            this.payload.id = this.id;
            this.payload.isActive = true;

            axios.post('/Manage/UpdateUserDetails', this.payload).then((response) => {

                this.isLoading = false;
                this.toastHandler('', 'User profile updated.');

            }).catch((error) => {

                this.isLoading = false;
                this.toastHandler('error', 'Unable to update user profile.');

            });
              

        },

       
        getUserDetails() {

            axios.get('/Manage/GetUserDetails').then((response) => {

                this.name = response.data.name;
                this.surname = response.data.surname;
                this.phoneNumber = response.data.phoneNumber;
                this.userName = response.data.userName;
                this.emailAddress = response.data.emailAddress;
                this.id = response.data.id;
                

            }).catch((error) => {

                console.log(error);
            });
        },
         
       
        toastHandler(type, message = 'An unexpected error occurred.') {

            //display alert with 
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 10000,
            };

            switch (type) {

                case 'warning':
                    toastr.warning('', message);
                    break;
                case 'error':
                    toastr.error('', message);
                    break;
                default:
                    toastr.success('', message);
                    break;
            }

        },

        
    },

    created() {
         
        this.getUserDetails();
    },
});