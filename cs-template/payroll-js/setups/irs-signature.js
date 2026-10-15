
var vue = new Vue({
    el: '#app',
    data: {

        isLoading: false,
        payload: {},
        name: '',
        title: '',

    },

    methods: {

        getSetupData() {

            axios.get('/PayrollSetups/GetIrsSignature').then(response => {

                if (response.data) {

                    this.name = response.data.name;
                    this.title = response.data.title;
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to get IRS Signature.');

            });
        },

        createOrUpdateIrsSignature() {

            this.isLoading = true;

            let payload = {};

            payload.name = this.name;
            payload.title = this.title;

            axios.post('/PayrollSetups/CreateIrsSignature', payload).then(response => {

                this.getSetupData();

               this.toastHandler('', 'IRS Signature created.');

               this.isLoading = false;

            }).catch(err => {

                this.toastHandler('error', 'Unable to create IRS Signature.');

                this.isLoading = false;

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

        this.getSetupData();

    },
});