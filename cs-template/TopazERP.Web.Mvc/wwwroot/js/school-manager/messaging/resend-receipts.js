
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        studentList: [],
        statementList: [],
        selectedClassId: '',
        selectedStudentId: '',
        schClasses: [],
        siteBaseUrl: '',
        receiptList: [],
        currentStatement: {},
        studentStatementResponse: {},
        messageContent: '',
        subject: '',
        messagingChannel: 'sms'

    },
    methods: {

        
        getStudentStatement() {

            if (this.selectedStudentId) {

                axios.get('/Students/GetStudentStatement?id=' + this.selectedStudentId).then(response => {

                    if (response.data) {
                        this.studentStatementResponse = response.data;
                        this.statementList = response.data.statement;
                    }
                  

                }).catch(err => {

                    this.toastHandler('error', 'Unable to get student statement.');

                });

            }
            
        },

        getSchClasses() {

            axios.get('/schsetups/GetClasses').then(response => {

                this.schClasses = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get classes.');

            });
        },

        initSendReceipt(statement) {

            this.currentStatement = statement;

            this.subject = `Payment Receipt (${statement.referenceNo})`;


            if (statement.balance <= 0) {

                this.messageContent = `Payment of GHS ${statement.payment} has been received as full payment for Kwabena Addo on ${statement.activityDate}. You have no outstanding balance.`;
            }
            else {

                this.messageContent = `Payment of GHS ${statement.payment} has been received as part payment for Kwabena Addo on ${statement.activityDate}. Your outstanding balance is GHS ${statement.balance}.`;
            }


            $('#receiptConfirmation').modal('show');

        },

        sendReceipt() {

            this.isLoading = true;

            let payload = {};

            payload.id = this.studentStatementResponse.id;
            payload.messagingChannel = this.messagingChannel;
            payload.statementId = this.currentStatement.id;

            axios.post('/SchMessaging/SendReceipt', payload).then(response => {

                this.toastHandler('error', 'Receipt Sent successfully.');

                this.isLoading = true;

            }).catch(err => {

                this.toastHandler('error', 'Receipt Sending failed.');
                this.isLoading = false;

            });
        },

        getStudents() {

            if (this.selectedClassId) {

                axios.get('/Students/GetStudentByClass?id=' + this.selectedClassId).then(response => {

                    this.studentList = response.data;

                }).catch(err => {

                    this.toastHandler('error', 'Unable to get students.');

                });
            }
             
        },
         

        formatDate(dateInput) {

            return moment(dateInput).format("YYYY-MM-DD");

        },

        formatShortDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");

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

        classList() {

            this.schClasses.forEach((v) => {

                if (v.streamId != '00000000-0000-0000-0000-000000000000') {
                    v.className = v.className + '-' + v.streamName;
                }

            });

            return this.schClasses;
        },
         
    },
    watch: {

        selectedClassId(val) {

            this.getStudents();
        },

        selectedStudentId(val) {

            this.getStudentStatement();
        }
    },
    created() {

        this.getSchClasses();
        
    },
});