const app = Vue.createApp({
    data() {
        return {
            file: null,
            previewData: [],
            isLoading: false,
            currentPage: 1,
            pageSize: 10
        };
    },
    computed: {
        hasErrors() {
            return this.previewData.some(r =>
                r.errors && r.errors.length > 0
            );
        },
        paginatedData() {
            const start = (this.currentPage - 1) * this.pageSize;
            return this.previewData.slice(start, start + this.pageSize);
        },

        totalPages() {
            return Math.ceil(this.previewData.length / this.pageSize);
        },
        paginationPages() {
            const total = this.totalPages;
            const current = this.currentPage;
            const delta = 2;

            const range = [];
            const rangeWithDots = [];

            let l;

            for (let i = 1; i <= total; i++) {
                if (
                    i === 1 ||
                    i === total ||
                    (i >= current - delta && i <= current + delta)
                ) {
                    range.push(i);
                }
            }

            for (let i of range) {
                if (l) {
                    if (i - l === 2) {
                        rangeWithDots.push(l + 1);
                    } else if (i - l > 2) {
                        rangeWithDots.push('...');
                    }
                }
                rangeWithDots.push(i);
                l = i;
            }
            return rangeWithDots;
        },
    },
    methods: {

        onFileUpload(event) {
            this.file = event.target.files[0];
            this.previewFile();
        },

        async previewFile() {
            this.isLoading = true;
            if (!this.file) {
                this.toastHandler('warning', 'Please select a file to preview.');
                return;
            }

            let formData = new FormData();
            formData.append("customFile", this.file);

            try {
                const response = await axios.post(
                    '/ArImportData/PreviewOpeningBalanceImport', formData,
                    {headers: {'Content-Type': 'multipart/form-data'}}
                );

                this.previewData = response.data.result.result;
                this.isLoading = false;

            } catch (error) {
                console.error(error);
                this.toastHandler('error', 'Failed to preview file.');
                this.loading = false;
            }
        },
        formatDate(dateInput) {
            return moment(dateInput).format("YYYY-MM-DD");
        },
        importData() {

            const validRows = this.previewData.filter(x => !x.errors || x.errors.length === 0);

            if (validRows.length === 0) {
                this.toastHandler('warning', 'No valid rows to import.');
                return;
            }

            axios.post('/ArImportData/ImportOpeningBalances', validRows)
                .then(res => {

                    const result = res.data?.result?.result;

                    if (!result) {
                        this.toastHandler('error', 'Import failed');
                        return;
                    }

                    this.toastHandler(
                        result.code === 200 ? 'success' : 'error',
                        result.message
                    );
                    this.previewData = []
                })
                .catch(err => {
                    console.error(err);
                    this.toastHandler('error', 'Import failed');
                    this.previewData = []
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
    watch:{
        // watch for file upload then preview
        file: function (newVal, oldVal) {
            if (newVal) {
                this.previewFile();
            }
        }
    },
});
app.mount('#app');