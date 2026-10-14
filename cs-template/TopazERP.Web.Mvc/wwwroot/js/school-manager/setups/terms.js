const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            termList: [],
        }
    },
    methods: {
        getSetupData() {
            axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`).then(response => {

                this.termList = response.data;
                this.dataTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get terms.');

            });

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
                    { field: "name", headerText: "Term Name", validationRules: { required: true, minlength: 1 }, width: 75 },
                    { field: "ordinal", headerText: "Ordinal Level", defaultValue: 1, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 0 }, validationRules: { required: true, }, width: 40 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15 }
                ],
                endAdd: (args) => {
                    this.saveTerm(args.data);
                },
                endEdit: (args) => {
                    this.updateTerm(args.data);
                },
                endDelete: (args) => {
                    this.delTerm(args.data.id);
                }
            });
        },

        saveTerm(payload) {

            delete payload.id;
            delete payload.tenantId;

            axios.post('/SmMainSetups/CreateTerm/', payload).then(response => {

                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to save term.');

            });
        },

        updateTerm(payload) {


            axios.post('/SmMainSetups/UpdateTerm/', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Term updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update term.');

            });
        },

        delTerm(id) {

            axios.get('/SmMainSetups/DeleteTerm?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'Term deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete term.');

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