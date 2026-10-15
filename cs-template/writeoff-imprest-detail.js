let vue = new Vue({
    el: '#app',
    data: {
        isShimmerLoading: false,
        id: null,
        form: {
            id: null,
            writeOffDate: '',
            amount: 0,
            writtenOffBy: '',
            authorizedBy: '',
            notes: ''
        }
    },
    methods: {
        getRecord() {
            this.isShimmerLoading = true;
            axios.get(`/LedgerDataEntry/GetWriteoff?id=${this.id}`)
                .then(response => {
                    this.form = response.data;
                    if (this.form.writeOffDate) {
                        this.form.writeOffDate = this.form.writeOffDate.split('T')[0];
                    }
                    this.isShimmerLoading = false;
                }).catch(err => {
                    this.isShimmerLoading = false;
                    this.toastHandler('error', 'Unable to fetch record.');
                });
        },
        updateWriteoff() {
            axios.post('/LedgerDataEntry/WriteOffImprestPost', this.form)
                .then(response => {
                    this.toastHandler('success', 'Writeoff updated successfully.');
                    setTimeout(() => window.location.href = '/LedgerDataEntry/Imprest', 1500);
                }).catch(err => {
                    this.toastHandler('error', 'Unable to update writeoff.');
                });
        },
        toastHandler(type, message) {
            toastr.options = { closeButton: true, progressBar: true, timeOut: 5000 };
            if (type === 'error') toastr.error('', message);
            else if (type === 'warning') toastr.warning('', message);
            else toastr.success('', message);
        }
    },
    created() {
        const urlParams = new URLSearchParams(window.location.search);
        this.id = urlParams.get('id');
        if (this.id) {
            this.getRecord();
        }
    }
});
