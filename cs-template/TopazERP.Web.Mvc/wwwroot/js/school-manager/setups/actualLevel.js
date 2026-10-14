const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            levelList: [
                {
                    "id": "b1c2d3e4-f5a6-4789-9abc-1234567890ab",
                    "name": "Primary"
                },
                {
                    "id": "c2d3e4f5-a6b7-4890-abcd-2345678901bc",
                    "name": "JHS"
                }
            ],
            
        }
    },
    methods: {
        getSetupData() {
                this.dataTable(this.levelList);
                
        },

        dataTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: {
                    pageSize: 20,
                    pageSizeList: [10, 20, 50, 100]
                },
                scrollSettings: { width: "1200px", height: "400px" },
                columns: [
                    { field: "id", headerText: "id", width: 25, visible: false, isPrimaryKey: true,  },
                    { field: "name", headerText: "Actual Level", validationRules: { required: true, minlength: 1 }, width: 75 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15 }
                ],
                endAdd: (args) => {
                    this.saveLevels(args.data);
                },
                endEdit: (args) => {
                    this.updateLevels(args.data);
                },
                endDelete: (args) => {
                    this.delLevels(args.data.id);
                }
            });
        },

        saveLevels(payload) {
            delete payload.id;
            delete payload.tenantId;
            axios.post('/SmMainSetups/CreateActualLevel/', payload).then(response => {
                
                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'Actual level saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }
            }).catch(err => {
                this.toastHandler('error', 'Unable to save actual level.');
            });
        },

        updateLevels(payload) {


            axios.post('/SmMainSetups/UpdateActualLevel/', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Actual level updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update actual level.');

            });
        },

        delLevels(id) {

            axios.get('/SmMainSetups/DeleteActualLevel?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Actual level deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete actual level.');

            });
        },
        formatShortDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");

        },
        uuid() {

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
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

    mounted() {
        this.getSetupData();

    },
});
app.mount('#app');