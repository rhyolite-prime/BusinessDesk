const app = Vue.createApp({
    data() {
        return {
            saving: false,
            form: {
                id: null,
                examPercentage: 0,
                cat1Percentage: 0,
                cat2Percentage: 0,
                cat3Percentage: 0,
                cat4Percentage: 0
            }
        }
    },

    mounted() {
        this.loadCategoryPercentage();
    },

    methods: {

        loadCategoryPercentage() {
            axios.get('/SmDataEntry/GetAllCategoryPercentages')
                .then(res => {
                    if (res.data.length > 0) {
                        const data = res.data[0];
                        this.form.id = data.id;
                        this.form.examPercentage = data.examPercentage;
                        this.form.cat1Percentage = data.cat1Percentage;
                        this.form.cat2Percentage = data.cat2Percentage;
                        this.form.cat3Percentage = data.cat3Percentage;
                        this.form.cat4Percentage = data.cat4Percentage;
                        this.form.tenantId = data.tenantId;
                    }
                })
                .catch(() => this.toastHandler('error', 'Unable to load category percentages.'));
        },
        validateTotalPercentage() {
            const total =
                Number(this.form.examPercentage || 0) +
                Number(this.form.cat1Percentage || 0) +
                Number(this.form.cat2Percentage || 0) +
                Number(this.form.cat3Percentage || 0) +
                Number(this.form.cat4Percentage || 0);

            if (total !== 100) {
                this.toastHandler(
                    'error',
                    `Total percentage must be exactly 100%. Current total is ${total}%.`
                );
                return false;
            }

            return true;
        },

        save() {
            if (!this.validateTotalPercentage()) {
                return;
            }

            this.saving = true;

            const api = this.form.id
                ? '/SmDataEntry/UpdateCategoryPercentage'
                : '/SmDataEntry/CreateCategoryPercentage';

            axios.post(api, this.form)
                .then(() => {
                    this.toastHandler('', 'Data saved successfully.');
                })
                .catch(() => {
                    this.toastHandler('error', 'Failed to save data.');
                })
                .finally(() => {
                    this.saving = false;
                });
        },


        toastHandler(type, message) {
            toastr.options = { closeButton:true, progressBar:true, timeOut:4000 };
            type === 'error' ? toastr.error(message) : toastr.success(message);
        }
    }
});
app.mount('#app');
