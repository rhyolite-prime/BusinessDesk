
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        smsTopupAmount: null,
        walletTopupAmount: null,
        subscriptionSummary: [],
    },
    
    methods: {
      
        walletTopup() {

            if (this.walletTopupAmount == null || this.walletTopupAmount < 1) {

                this.$refs.walletTopupAmount.focus();

                return;
            }

            this.isLoading = true;

            this.payload = {};
            this.payload.Amount = this.walletTopupAmount;
            this.payload.serviceType = 'wallet';

            axios.post('/Manage/InitializePayment', this.payload).then(response => {


                if (response.data.status == 2000) {

                    this.toastHandler('', response.data.message);
                    window.location = response.data.returnUrl;
                }
                else {

                    this.toastHandler('error', 'Unable to process payment request.');
                }

                 this.isLoading = false;

            }).catch(err => {

                this.toastHandler('error', 'Unable to initialize payment.');
                this.isLoading = false;

            });

        },

        smsAccountTopup() {

            if (this.smsTopupAmount == null || this.smsTopupAmount < 1) {

                this.$refs.smsTopupAmount.focus();

                return;
            }

            this.isLoading = true;

            this.payload = {};
            this.payload.Amount = this.smsTopupAmount;
            this.payload.serviceType = 'sms';
            axios.post('/Manage/InitializePayment', this.payload).then(response => {


                if (response.data.status == 2000) {

                    this.toastHandler('', response.data.message);
                    window.location = response.data.returnUrl;
                }
                else {

                    this.toastHandler('error', 'Unable to process payment request.');
                }

                this.isLoading = false;

            }).catch(err => {

                this.toastHandler('error', 'Unable to initialize payment.');
                this.isLoading = false;

            });
        },

        getSubscriptionInfo() {

            axios.get('/Manage/GetSubscriptionInfo').then(response => {

                this.subscriptionSummary = response.data;

            }).catch(err => {

                this.toastHandler('error', '');

            });

        },

        downloadDocumentation(subscriptionInfo) {

            console.log(subscriptionInfo);

        },

        subscribeToModule(subscriptionInfo) {

            console.log(subscriptionInfo);

        },

        renewSubscription(subscriptionInfo) {

            console.log(subscriptionInfo);

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
    computed: {



    },
    filters: {

        currency: function (value) {
            return numeral(value).format('0,0.00');
        },
        number: function (value) {
            return numeral(value).format('0,0');
        },
        formatDate: function (value) {

            return moment(value).format("Do, MMM YYYY");

        },
        capitalize: function (value) {


            var capitalized = [];
            var exemptedCharacters = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;

            const isUpperCase = (string) => /^[A-Z]*$/.test(string);

            value.split(' ').forEach(word => {


                if (exemptedCharacters.test(word)) {

                    capitalized.push(
                        word.charAt(0) +
                        word.charAt(1).toUpperCase() +
                        word.slice(2).toLowerCase()
                    )

                }
                else {

                    capitalized.push(
                        word.charAt(0).toUpperCase() +
                        word.slice(1).toLowerCase()
                    )

                }

            });

            return capitalized.join(' ');

        },

    },
    created() {

        this.getSubscriptionInfo();
    },
});