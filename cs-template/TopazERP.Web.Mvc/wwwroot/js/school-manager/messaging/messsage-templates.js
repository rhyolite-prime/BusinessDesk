
var vue = new Vue({
    el: '#app',
    data: {

        isLoading: false,
        smsTemplateList: [],
        pageNo: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0,
        templateId: null,
        tenantId: 0,
        modalTitle: 'Add Template',
        alias: '',
        messageSubject: '',
        messageContent: '',
        upperBound: 0,
        lowerBound: 0

    },

    methods: {

        getTemplates() {

            axios.get(`/SchMessaging/GetMessageTemplates?pageNo=${this.pageNo}&pageSize=${this.pageSize}`).then(response => {

                this.smsTemplateList =  response.data.data;
                this.totalCount = response.data.totalCount;
                this.totalPages = response.data.totalPages;
                this.upperBound = response.data.upperBound;
                this.lowerBound = response.data.lowerBound;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get templates.');

            });
        },

        saveTemplate() {

            let payload = {};

            this.isLoading = true;

            payload.alias = this.alias;
            payload.messageSubject = this.messageSubject;
            payload.messageContent = this.messageContent;

            if (this.templateId != null) {

                payload.id = this.templateId;
                payload.tenantId = this.tenantId;

                axios.post('/SchMessaging/UpdateMessageTemplate', payload).then(response => {

                    this.getTemplates();

                    $('#addMessageTemplate').modal('hide');

                    this.toastHandler('', 'Template updated.');
                    this.isLoading = false;


                }).catch(err => {

                    this.toastHandler('error', 'Unable to update template.');
                    this.isLoading = false;

                });

            } else {

                axios.post('/SchMessaging/CreateMessageTemplate', payload).then(response => {

                    this.getTemplates();

                    $('#addMessageTemplate').modal('hide');

                    this.toastHandler('', 'Template saved.');

                    this.isLoading = false;

                }).catch(err => {

                    this.toastHandler('error', 'Unable to save template.');
                    this.isLoading = false;


                });
            }

           
        },
        initUpdate(template) {

            this.templateId = template.id;
            this.tenantId = template.tenantId;
            this.alias = template.alias;
            this.messageSubject = template.messageSubject;
            this.messageContent = template.messageContent;

            this.modalTitle = 'Update Template';

            $('#addMessageTemplate').modal('show');

        },
        resetModal() {

            this.modalTitle = 'Add Template';
            this.alias = '';
            this.messageSubject = '';
            this.messageContent = '';
            this.templateId = null;
            this.tenantId = 0;
        },
        delTemplate(id) {

            axios.get('/SchMessaging/DelMessageTemplate?id=' + id).then(response => {

                this.getTemplates();

                this.toastHandler('', 'Template deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete template.');

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
    computed: {

        pageList() {

            let counter = 1;
            let initPage = 1;
            const currentPage = this.pageNo;
            const pages = this.totalPages;

            if (currentPage > 9 && pages > 10) {
                initPage = currentPage - 5;
            }

            const pageNumbers = [];

            for (let i = initPage; i <= pages; i++) {
                pageNumbers.push(i);
                counter++;
                if (counter > 10) {
                    break;
                }
            }

            return pageNumbers;

        }

    },
    created() {

        this.getTemplates();
    },
});