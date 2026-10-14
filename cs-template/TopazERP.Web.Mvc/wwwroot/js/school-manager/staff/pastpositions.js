const app = Vue.createApp({
    data() {
        return {
            form: {
                staffId: window.staffId || '',
                designationId: '',
                designationName: '',
                startDate: new Date().toISOString().slice(0, 10),
                endDate: new Date().toISOString().slice(0, 10),
            },
            designations: [],
            positions: [],
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
        loadDropdowns() {
            axios.get('/SmStaffSetups/ListAllStaffDesignations')
                .then(res => this.designations = res.data)
                .catch(() => this.toastHandler('error', 'Unable to load designations.'));
        },
        setDesignationName() {
            const selected = this.designations.find(x => x.id === this.form.designationId);
            this.form.designationName = selected ? selected.name : '';
        },
        setStaffName() {
            const selected = this.staffList.find(s => s.id === this.form.staffId);
            this.form.staffName = selected ? `${selected.firstName} ${selected.otherName} ${selected.lastName}`.trim() : '';
        },
        savePosition() {
            if (this.form.staffId) this.setStaffName();

            if (this.form.id) {
                this.updatePosition();
                return;
            }

            axios.post('/SmStaffSetups/CreateStaffPastPosition/', this.form)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', 'data saved');
                        this.resetForm();
                        this.getStaffPastPositions();
                    } else {
                        this.toastHandler('error', response.data.message);
                    }
                })
                .catch(() => this.toastHandler('error', 'Unable to save past position.'));
        },
        updatePosition() {
            axios.post('/SmStaffSetups/UpdateStaffPastPosition', this.form)
                .then(() => {
                    this.toastHandler('', 'Past position updated successfully.');
                    this.resetForm();
                    this.getStaffPastPositions();
                })
                .catch(() => this.toastHandler('error', 'Unable to update past position.'));
        },
        getStaffPastPositions() {
            axios.get('/SmStaffSetups/ListAllStaffPastPositions/')
                .then(response => {
                    this.positions = response.data.filter(p => p.staffId === this.form.staffId);
                })
                .catch(() => this.toastHandler('error', 'Unable to load past positions.'));
        },
        editPosition(position) {
            this.form = {
                ...position,
                startDate: position.startDate ? position.startDate.slice(0, 10) : '',
                endDate: position.endDate ? position.endDate.slice(0, 10) : ''
            };
        },
        deletePosition(id) {
            axios.post(`/SmStaffSetups/DeleteStaffPastPosition?id=${id}`)
                .then(() => {
                    this.toastHandler('', 'Past position deleted successfully.');
                    this.getStaffPastPositions();
                })
                .catch(() => this.toastHandler('error', 'Unable to delete past position.'));
        },

        resetForm() {
            this.form = {
                staffId: this.form.staffId,
                designationId: '',
                designationName: '',
                startDate: new Date().toISOString().slice(0, 10),
                endDate: new Date().toISOString().slice(0, 10)
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
        this.loadDropdowns();
        this.getStaffList();
        this.getStaffPastPositions();
    }
});
app.mount('#app');
