
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        month: 1,
        year: ''

    },

    methods: {

        getSetupData() {

            axios.get('/PayrollSetups/GetPayMonth').then(response => {

                if (response.data) {

                    this.month = response.data.month;
                    this.year = response.data.year;
                }

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get pay month data.');

            });
        },

        initializePayMonth() {

            this.isLoading = true;

            let payload = {};
            
            if (!this.year) {
                
                this.toastHandler('warning', 'Please select a year.');
                
                return;
                
            }

            payload.month = parseInt(this.month);
            
            payload.year = parseInt(this.year);

            axios.post('/PayrollSetups/InitPayMonth', payload).then(response => {

                this.getSetupData();

               this.toastHandler('', 'Pay month Initialized.');

               this.isLoading = false;

            }).catch(err => {

                this.toastHandler('error', 'Unable to initialize pay month.');

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