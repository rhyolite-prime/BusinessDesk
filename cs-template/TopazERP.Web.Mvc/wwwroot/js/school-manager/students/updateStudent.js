const app = Vue.createApp({
    data() {
        return {
            form: {},
            countries: [],
            cities: [],
            religions: [],
            locations: [],
            classes: [],
            academicYears: [],
            statuses: [],
            houses: [],
            hostels: [],
            mainClasses: [],
            streams: [],
            errors: {},
            emptyGuid: '00000000-0000-0000-0000-000000000000',
        }
    },

    methods: {

        loadDropdowns() {

            axios.all([
                axios.get(`/jsonDataSample/countries.json?v=${new Date().getTime()}`),
                axios.get('/SharedResource/GetCities'),
                axios.get(`/jsonDataSample/religions.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllLocations'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get(`/jsonDataSample/studentStatuses.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllHostels/'),
                axios.get('/SmStudentSetups/ListAllHouses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
            ]).then(axios.spread((
                countries, cities, religions, locations, classes, years, statuses, hostels,houses,mainClasses,streams
            ) => {

                this.countries = countries.data;
                this.cities = cities.data;
                this.religions = religions.data;
                this.locations = locations.data;
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.academicYears = years.data;
                this.statuses = statuses.data;
                this.hostels = hostels.data;
                this.houses = houses.data;
                const activeYear = this.academicYears.find(y => y.isActive === true);
                if (activeYear) {
                    this.form.academicYearId = activeYear.id;
                }

                /* ✅ DEFAULT STATUS = "Active" */
                const activeStatus = this.statuses.find(
                    s => s.name?.toLowerCase() === 'active'
                );
                if (activeStatus) {
                    this.form.statusId = activeStatus.id;
                }

                // Initialize dropdowns after data is ready
                this.loadStudent();

            }));
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        // Load the student data based on query string
        loadStudent() {
            const urlParams = new URLSearchParams(window.location.search);
            const id = urlParams.get('id');
            if (!id) return;

            axios.get('/SmStudentSetUps/GetStudentById?id=' + id)
                .then(res => {
                    this.form = res.data;

                    // Format dates for input[type=date]
                    const formatDate = d => d ? d.slice(0, 10) : '';
                    this.form.dateOfBirth = formatDate(this.form.dateOfBirth);
                    this.form.admissionDate = formatDate(this.form.admissionDate);
                    this.form.balanceDueDate = formatDate(this.form.balanceDueDate);

                    // Initialize dropdowns after form is loaded
                    this.initDropdowns();
                })
                .catch(() => this.toastHandler('error', 'Unable to load student data.'));
        },

        // Initialize Syncfusion dropdowns with selected values
        initDropdowns() {

            const levelClassDropdown = this.classes.map(c => ({
                id: c.id,
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));

            $('#classId').ejDropDownList({
                dataSource: levelClassDropdown,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                value: this.form.classId,
                change: args => this.form.classId = args.value
            });


            $('#countryId').ejDropDownList({
                dataSource: this.countries,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                value: this.form.countryId,
                change: args => this.form.countryId = args.value
            });

            $('#cityId').ejDropDownList({
                dataSource: this.cities,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                value: this.form.cityId,
                change: args => this.form.cityId = args.value
            });

            $('#locationId').ejDropDownList({
                dataSource: this.locations,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                value: this.form.locationId,
                change: args => this.form.locationId = args.value
            });

            $('#religionId').ejDropDownList({
                dataSource: this.religions,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                value: this.form.religionId,
                change: args => this.form.religionId = args.value
            });

            $('#academicYearId').ejDropDownList({
                dataSource: this.academicYears,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                value: this.form.academicYearId,
                change: args => this.form.academicYearId = args.value
            });

            $('#statusId').ejDropDownList({
                dataSource: this.statuses,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                value: this.form.statusId,
                change: args => this.form.statusId = args.value
            });
            $('#houseId').ejDropDownList({
                dataSource: this.houses,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                value: this.form.houseId,
                change: args => this.form.houseId = args.value
            });
            $('#hostelId').ejDropDownList({
                dataSource: this.hostels,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                value: this.form.hostelId,
                change: args => this.form.hostelId = args.value
            });
        },
        validateForm() {
            this.errors = {};

            const today = new Date();
            const todayStr = today.toISOString().substr(0, 10);

            // ✅ DOB Validation
            if (!this.form.dateOfBirth) {
                this.errors.dateOfBirth = 'Date of birth is required.';
            } else if (this.form.dateOfBirth >= todayStr) {
                this.errors.dateOfBirth = 'Child must be at least 1 day old.';
            }

            // Required fields
            if (!this.form.admissionDate) {
                this.errors.admissionDate = 'Admission Date is required.';
            }

            if (!this.form.classId || this.form.classId === this.emptyGuid) {
                this.errors.classId = 'Class is required.';
            }

            if (!this.form.countryId || this.form.countryId === this.emptyGuid) {
                this.errors.countryId = 'Country is required.';
            }

            if (!this.form.cityId || this.form.cityId === this.emptyGuid) {
                this.errors.cityId = 'City is required.';
            }

            if (!this.form.religionId || this.form.religionId === this.emptyGuid) {
                this.errors.religionId = 'Religion is required.';
            }

            if (!this.form.academicYearId || this.form.academicYearId === this.emptyGuid) {
                this.errors.academicYearId = 'Academic Year is required.';
            }

            if (!this.form.statusId || this.form.statusId === this.emptyGuid) {
                this.errors.statusId = 'Status is required.';
            }
            if (!this.form.firstName) {
                this.errors.firstName = 'First Name is required.';
            }
            if (!this.form.lastName) {
                this.errors.lastName = 'Last Name is required.';
            }
            if (!this.form.gender){
                this.errors.gender = 'Gender is required.';
            }
            if (!this.form.address) {
                this.errors.address = 'Address is required.';
            }

            return Object.keys(this.errors).length === 0;
        },
        // Update student
        updateStudent() {
            if (!this.validateForm()) {
                this.toastHandler('error', 'Please enter required fields.');
                return;
            }
            axios.post('/SmStudentSetUps/UpdateStudent', this.form)
                .then(() => {
                    this.toastHandler('', 'Student updated successfully.');
                    this.loadStudent();
                })
                .catch(() => this.toastHandler('error', 'Unable to update student.'));
        },

        // Toast messages
        toastHandler(type, message) {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                timeOut: 4000
            };
            type === 'error' ? toastr.error(message) : toastr.success(message);
        },

        // Optional: Helper methods to set display names
        setCountryName() { const selected = this.countries.find(x => x.id === this.form.countryId); this.form.countryName = selected ? selected.name : ''; this.form.nationality = selected ? selected.nationality : ''; },
        setCityName() { const selected = this.cities.find(x => x.id === this.form.cityId); this.form.cityName = selected ? selected.name : ''; },
        setLocationName() { const selected = this.locations.find(x => x.id === this.form.locationId); this.form.locationName = selected ? selected.name : ''; },
        setReligionName() { const selected = this.religions.find(x => x.id === this.form.religionId); this.form.religionName = selected ? selected.name : ''; },
        setClassName() { const selected = this.classes.find(x => x.id === this.form.classId); this.form.className = selected ? selected.name : ''; },
        setAcademicYearName() { const selected = this.academicYears.find(x => x.id === this.form.academicYearId); this.form.academicYearName = selected ? selected.name : ''; },
        setStatusName() { const selected = this.statuses.find(x => x.id === this.form.statusId); this.form.statusName = selected ? selected.name : ''; },
        setHostelName() { const selected = this.hostels.find(x => x.id === this.form.hostelId); this.form.hostelName = selected ? selected.name : ''; },
        setHouseName() { const selected = this.houses.find(x => x.id === this.form.houseId); this.form.houseName = selected ? selected.name : '';}

    },

    mounted() {
        this.loadDropdowns();
    }
});
app.mount('#app');