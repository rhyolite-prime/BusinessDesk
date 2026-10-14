const app = Vue.createApp({
    data() {
        return {
            isLoading: false,
            ptaExecutives: [],
            academicYearId: '',
            academicYears: [],
            reportHeader: [],
            reportTitle: '',
            reportApiBaseUrl: '',
            positions: [],
            searchByPosition: false,
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770204433/erp-reports/school-manager/pta-executives-all_cet9r3.rdl'
        }
        },
    mounted() {
        this.loadData();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
    methods: {
        loadData() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears/'),
                axios.get('/SmReports/GetReportHeader/'),
                axios.get('/SmDataEntry/GetAllPtaExecutives/'),
                axios.get('/SmMainSetups/ListAllPtaPositions/'),
            ]).then(axios.spread((years, header, ptaExecs, positions) => {
                this.academicYears = years.data;
                this.reportHeader = header.data;
                this.ptaExecutives = ptaExecs.data;
                this.positions = positions.data;
                

                this.initDropdowns();
            }));
        },
        searchReport() {
            if (!this.academicYearId) {
                this.toastHandler('warning', 'Please select an academic year.');
                return;
            }

            const year = this.academicYears.find(y => String(y.id) === String(this.academicYearId))?.name || '';

            let filteredExecs = this.ptaExecutives.filter(
                e => String(e.academicYearId) === String(this.academicYearId)
            );

            // Only filter by position if checkbox is checked
            if (this.searchByPosition && this.ptaPositionId) {
                filteredExecs = filteredExecs.filter(
                    e => String(e.ptaPositionId) === String(this.ptaPositionId)
                );
            }

            if (!filteredExecs.length) {
                this.toastHandler('warning', 'No PTA executives found for the selected filters.');
                return;
            }

            const positionName = this.searchByPosition && this.ptaPositionId
                ? this.positions.find(p => String(p.id) === String(this.ptaPositionId))?.name || ''
                : 'All Positions';

            this.reportTitle = `PTA Executives for ${positionName} - Academic Year '${year}'`;

            const reportRows = filteredExecs.map(e => ({
                Name: e.name,
                Position: this.positions.find(p => String(p.id) === String(e.ptaPositionId))?.name || '',
                PhoneNumber: e.phoneNumber,
                Email: e.email,
                Address: e.address,
                StartDate: this.normalizeDate(e.startDate),
                EndDate: this.normalizeDate(e.endDate),
                Title: this.reportTitle,
                AcademicYear: year
            }));

            let reportPath = this.searchByPosition && this.ptaPositionId
                ? 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770204378/erp-reports/school-manager/pta-executives-by-position_v3drlk.rdl'
                : 'https://res.cloudinary.com/dusydqiob/raw/upload/v1770204433/erp-reports/school-manager/pta-executives-all_cet9r3.rdl';

            this.renderReport(this.reportHeader, reportRows, reportPath);
        },


        initDropdowns() {
            const activeYear = this.academicYears.find(y => y.isActive === true);

            $('#academicYearId').ejDropDownList({
                dataSource: this.academicYears,
                width: "100%",
                watermarkText: "Select Academic Year...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.academicYearId = args.value;
                    this.searchReport();
                },
                value: activeYear ? activeYear.id : null
            });

            if (activeYear) {
                this.academicYearId = activeYear.id;
                this.searchReport();           
            }
            $('#positionId').ejDropDownList({
                dataSource: this.positions,
                width: "100%",
                watermarkText: "Select Position...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.ptaPositionId = args.value;
                    this.searchReport();
                }
            });

        },
        renderReport(header, details, reportPath) {
            $("#reportView").empty();
            $("#reportView").boldReportViewer({
                reportServiceUrl: this.reportApiBaseUrl,
                processingMode: ej.ReportViewer.ProcessingMode.Local,
                toolbarSettings: {
                    showToolbar: true,
                    items: ej.ReportViewer.ToolbarItems.All &
                        ~ej.ReportViewer.ToolbarItems.Print
                },
                reportPath: reportPath,
                dataSources: [
                    { value: header, name: "DataSet1" },
                    { value: details, name: "DataSet2" }
                ]
            });
        },
        normalizeDate(date) {
            if (!date) return null;
            return new Date(date).toISOString().split('T')[0];
        },
        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 10000,
            };

            switch (type) {
                case 'warning': toastr.warning('', message); break;
                case 'error': toastr.error('', message); break;
                default: toastr.success('', message); break;
            }
        }
    }
});
app.mount('#app');
