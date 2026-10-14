const app = Vue.createApp({
    data() {
        return {
            isShimmerLoading: false,
            payload: {},
            paymentMethodList: [],
        }
    },
    methods: {
        getSetupData() {
            axios.get(`/jsonDataSample/paymentMethods.json?v=${new Date().getTime()}`).then(response => {
                this.paymentMethodList = response.data;
                this.dataTable(response.data);
            }).catch(() => {
                this.toastHandler('error', 'Unable to get data.');
            });
        },

        dataTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: { pageSize: 20 },
                scrollSettings: { width: "800px", height: "400px" },
                columns: [
                    { field: "id", visible: false, isPrimaryKey: true },
                    { field: "name", headerText: "Payment Method", validationRules: { required: true }, width: 200 },
                    { field: "tenantId", visible: false }
                ],
                endAdd: (args) => this.savePaymentMethod(args.data),
                endEdit: (args) => this.updatePaymentMethod(args.data),
                endDelete: (args) => this.delPaymentMethod(args.data.id)
            });
        },

        savePaymentMethod(payload) {
            delete payload.id;
            delete payload.tenantId;
            axios.post('/SmMainSetups/CreatePaymentMethod', payload).then(response => {
                if (response.data.code === 200) {
                    this.getSetupData();
                    this.toastHandler('', 'data saved.');
                } else {
                    this.toastHandler('error', response.data.message);
                    this.getSetupData();
                }
            }).catch(() => this.toastHandler('error', 'Unable to save data.'));
        },

        updatePaymentMethod(payload) {
            axios.post('/SmMainSetups/UpdatePaymentMethod', payload).then(() => {
                this.getSetupData();
                this.toastHandler('', 'Data updated.');
            }).catch(() => this.toastHandler('error', 'Unable to update data.'));
        },

        delPaymentMethod(id) {
            axios.get('/SmMainSetups/DeletePaymentMethod?id=' + id).then(() => {
                this.getSetupData();
                this.toastHandler('', 'Data deleted.');
            }).catch(() => this.toastHandler('error', 'Unable to delete data.'));
        },

        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = { closeButton: true, progressBar: true, timeOut: 10000 };
            switch (type) {
                case 'warning': toastr.warning('', message); break;
                case 'error': toastr.error('', message); break;
                default: toastr.success('', message); break;
            }
        }
    },
    mounted() {
        this.getSetupData();
    }
});
app.mount('#app');