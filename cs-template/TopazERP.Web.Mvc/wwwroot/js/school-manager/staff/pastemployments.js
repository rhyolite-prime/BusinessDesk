const app = Vue.createApp({
    data() {
        return {
            form: {
                staffId: window.staffId || '',
                companyName: '',
                startDate: new Date().toISOString().slice(0, 10),
                endDate: new Date().toISOString().slice(0, 10),
                reason: '',
            },
            employments: [],
            staffList: [],
            staffName: '',
        }
    },
    methods: {
        getStaffList() {
            axios.get('/SmStaffSetups/ListAllStaffBios')
                .then(res => {
                    this.staffList = res.data;

                    // Now that staffList is loaded, get the staff name
                    if (this.form.staffId) {
                        this.getStaffName();
                    }
                })
                .catch(() => this.toastHandler('error', 'Unable to load staff data.'));
        },

        getStaffName() {
            const selected = this.staffList.find(s => s.id === this.form.staffId);
            this.staffName = selected
                ? `${selected.firstName} ${selected.otherName || ''} ${selected.lastName}`.trim()
                : '';

            return this.staffName;
        },

        setStaffName() {
            const selected = this.staffList.find(s => s.id === this.form.staffId);
            this.form.staffName = selected ? `${selected.firstName} ${selected.otherName} ${selected.lastName}`.trim() : '';
        },
        saveEmployment() {
            if (this.form.staffId) this.setStaffName();

            if (this.form.id) {
                this.updateEmployment();
                return;
            }

            axios.post('/SmStaffSetups/CreateStaffPastEmployment', this.form)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', 'data saved');
                        this.resetForm();
                        this.getStaffPastEmployments();
                    } else {
                        this.toastHandler('error', response.data.message);
                    }
                })
                .catch(() => this.toastHandler('error', 'Unable to save past employment.'));
        },
        updateEmployment() {
            axios.post('/SmStaffSetups/UpdateStaffPastEmployment', this.form)
                .then(() => {
                    this.toastHandler('', 'Past employment updated successfully.');
                    this.resetForm();
                    this.getStaffPastEmployments();
                })
                .catch(() => this.toastHandler('error', 'Unable to update past employment.'));
        },
        getStaffPastEmployments() {
            axios.get('/SmStaffSetups/ListAllStaffPastEmployments/')
                .then(response => {
                    this.employments = response.data.filter(e => e.staffId === this.form.staffId);
                })
                .catch(() => this.toastHandler('error', 'Unable to load past employments.'));
        },
        editEmployment(employment) {
            this.form = {
                ...employment,
                startDate: employment.startDate ? employment.startDate.slice(0, 10) : '',
                endDate: employment.endDate ? employment.endDate.slice(0, 10) : ''
            };
        },
        deleteEmployment(id) {
            axios.post(`/SmStaffSetups/DeleteStaffPastEmployment?id=${id}`)
                .then(() => {
                    this.toastHandler('', 'Past employment deleted successfully.');
                    this.getStaffPastEmployments();
                })
                .catch(() => this.toastHandler('error', 'Unable to delete past employment.'));
        },
        resetForm() {
            this.form = {
                staffId: this.form.staffId,
                companyName: '',
                startDate: new Date().toISOString().slice(0, 10),
                endDate: new Date().toISOString().slice(0, 10),
                reason: ''
            };
        },
        formatDate(date) {
            if (!date) return '';
            return new Date(date).toLocaleDateString();
        },
        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 5000,
            };

            switch (type) {
                case 'warning': toastr.warning('', message); break;
                case 'error': toastr.error('', message); break;
                default: toastr.success('', message); break;
            }
        },
    },
    mounted() {
        this.form.staffId = window.staffId;
        this.getStaffList();
        this.getStaffPastEmployments();
        
    }
});
app.mount('#app');
