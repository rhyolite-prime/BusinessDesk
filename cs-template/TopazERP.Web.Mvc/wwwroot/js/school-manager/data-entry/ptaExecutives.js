const app = Vue.createApp({
    data() {
        return {
            academicYears: [],
            ptaPositions: [],
            ptaExecutives: [],
            saving: false,

            form: {
                id: null,
                academicYearId: null,
                academicYearName: '',
                ptaPositionId: null,
                ptaPositionName: '',
                name: '',
                phoneNumber: '',
                email: '',
                address: '',
                startDate: '',
                endDate: '',
                tenantId: null
            }
        }
    },

    mounted() {
        this.loadData();
    },
    computed: {

        filteredExecutives() {

            if (!this.form.academicYearId)
                return [];

            return this.ptaExecutives.filter(x =>
                x.academicYearId === this.form.academicYearId
            );
        }

    },
    methods: {
        printPreview() {
            const activeYear = this.academicYears.find(y => y.isActive);
            if (!activeYear) {
                this.toastHandler('warning', 'No active academic year found.');
                return;
            }

            const currentDate = new Date().toLocaleDateString();

            // Filter executives for active academic year
            const executives = this.ptaExecutives.filter(e => e.academicYearId === activeYear.id);
            if (!executives.length) {
                this.toastHandler('warning', 'No PTA executives found for the active academic year.');
                return;
            }

            // Group by PTA Position
            const positions = [...new Set(executives.map(e => e.ptaPositionId))];

            let html = `
<html>
<head>
    <title>PTA Executives Report</title>
    <style>
       
        body { font-family:"Times New Roman"; margin: 20px; }
        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 80px;
            text-align: center;
            z-index: 999;
        }
        .header h3, .header h4 { margin: 5px 0; }
        .content { 
            margin-top: 90px; 
            margin-bottom: 60px; 
            width: 100%;
        }
       table { width: 100%; border-collapse: collapse; margin-top: 20px; }
       th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
       thead {border-bottom: 1px solid #000;}
       th { background-color: #f2f2f2; border : none;}
       td {border: none;}
        @media print {
            .footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: 50px;
                border-top: 1px solid #000;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                padding: 0 20px;
                background-color: white;
            }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h4>PTA Executives for Current Academic Year: ${activeYear.name}</h4>
    </div>

    <div class="content">
`;

            positions.forEach((positionId, index) => {
                const positionName = this.ptaPositions.find(p => p.id === positionId)?.name || '';
                const execs = executives.filter(e => e.ptaPositionId === positionId);

                html += `<h5>Position: ${positionName}</h5>`;
                html += `
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                </tr>
            </thead>
            <tbody>
                ${execs.map((e, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${e.name || ''}</td>
                        <td>${e.phoneNumber || ''}</td>
                        <td>${e.email || ''}</td>
                        <td>${e.address || ''}</td>
                        <td>${e.startDate ? moment(e.startDate).format('DD-MMM-YYYY') : ''}</td>
                        <td>${e.endDate ? moment(e.endDate).format('DD-MMM-YYYY') : ''}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${index < positions.length - 1 ? '<div class="page-break"></div>' : ''}
        `;
            });

            html += `
    </div>

   <div class="footer">
                <div class="right">Printed On - ${currentDate}</div>
                 <div class="center">Topaz School Manager</div>
                <div class="left">Page 1</div>
            </div>
</body>
</html>
`;

            const printWindow = window.open('', '', 'width=1200,height=800');
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        },

        /* ===========================
           LOAD DATA
        ============================ */
        loadData() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllPtaPositions'),
                axios.get('/SmDataEntry/GetAllPtaExecutives')
            ]).then(axios.spread((years, positions, executives) => {

                this.academicYears = years.data;
                this.ptaPositions = positions.data;
                this.ptaExecutives = executives.data;

                this.initDropdowns();
            }));
        },

        initDropdowns() {
            const activeYear = this.academicYears.find(y => y.isActive === true);
            $('#academicYearId').ejDropDownList({
                dataSource: this.academicYears,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.form.academicYearId = args.value;
                    this.setAcademicYearName();
                },
                value: activeYear ? activeYear.id : null
            });
            if (activeYear) {
                this.form.academicYearId = activeYear.id;
                this.setAcademicYearName();
            }
          

            $('#ptaPositionId').ejDropDownList({
                dataSource: this.ptaPositions,
                fields: { id: 'id', text: 'name', value: 'id' },
                width: '100%',
                watermarkText: "Select...",
                enableFilterSearch: true,
                change: args => {
                    this.form.ptaPositionId = args.value;
                    this.setPtaPositionName();
                }
            });
            
            //set default dates to current
            const today = new Date().toISOString().substr(0, 10);
            this.form.startDate = today;
            this.form.endDate = today;
        },

        /* ===========================
           LOAD EXISTING (EDIT MODE)
        ============================ */
        loadExistingExecutive() {

            if (!this.form.academicYearId || !this.form.ptaPositionId)
                return;

            const match = this.ptaExecutives.find(x =>
                x.academicYearId === this.form.academicYearId &&
                x.ptaPositionId === this.form.ptaPositionId &&
                x.name === this.form.name
            );

            if (match) {
                // normalize dates for <input type="date">
                const startDate = match.startDate ? this.formatDate(match.startDate) : '';
                const endDate = match.endDate ? this.formatDate(match.endDate) : '';

                this.form = {
                    ...match,
                    startDate,
                    endDate
                };
            } else {
                // reset for create mode
                const today = new Date().toISOString().split('T')[0];
                this.form.id = null;
                this.form.tenantId = 0;
                this.form.startDate = today;
                this.form.endDate = today;
            }
        },
        formatDate(dateInput) {

            return moment(dateInput).format("YYYY-MM-DD");

        },

        /* ===========================
           SAVE
        ============================ */
        save() {

            if (!this.form.academicYearId || !this.form.ptaPositionId || !this.form.name) {
                this.toastHandler('error', 'Please complete all required fields');
                return;
            }

            this.saving = true;

            const api = this.form.id
                ? '/SmDataEntry/UpdatePtaExecutive'
                : '/SmDataEntry/CreatePtaExecutive';

            axios.post(api, this.form)
                .then(() => {
                    this.toastHandler('', 'PTA Executive saved successfully.');
                    this.resetForm();
                    this.reloadExecutives();
                })
                .catch(() => {
                    this.toastHandler('error', 'Unable to save PTA Executive.');
                })
                .finally(() => {
                    this.saving = false;
                });
        },
        editExecutive(item) {

            this.form = {
                ...item,
                startDate: item.startDate
                    ? this.formatDate(item.startDate)
                    : '',

                endDate: item.endDate
                    ? this.formatDate(item.endDate)
                    : ''
            };

            // set dropdowns
            const ayDd = $("#academicYearId").data("ejDropDownList");
            if (ayDd) {
                ayDd.option("value", item.academicYearId);
            }

            const positionDd = $("#ptaPositionId").data("ejDropDownList");
            if (positionDd) {
                positionDd.option("value", item.ptaPositionId);
            }
        },
        deleteExecutive(id) {

            if (!confirm("Are you sure you want to delete this PTA Executive?"))
                return;

            axios.post(`/SmDataEntry/DeletePtaExecutive?id=${id}`)
                .then(() => {

                    this.toastHandler('', 'PTA Executive deleted successfully');

                    this.reloadExecutives();

                    if (this.form.id === id) {
                        this.resetForm();
                    }

                })
                .catch(() => {

                    this.toastHandler('error', 'Unable to delete PTA Executive');

                });
        },
        reloadExecutives() {
            axios.get('/SmDataEntry/GetAllPtaExecutives')
                .then(res => this.ptaExecutives = res.data);
        },

        /* ===========================
           HELPERS
        ============================ */
        setAcademicYearName() {
            const s = this.academicYears.find(x => x.id === this.form.academicYearId);
            this.form.academicYearName = s ? s.name : '';
        },

        setPtaPositionName() {
            const s = this.ptaPositions.find(x => x.id === this.form.ptaPositionId);
            this.form.ptaPositionName = s ? s.name : '';
        },

        resetForm() {

            // find active academic year
            const activeYear = this.academicYears.find(x => x.isActive === true);

            const today = new Date().toISOString().split('T')[0];

            this.form = {
                id: null,
                academicYearId: activeYear ? activeYear.id : null,
                academicYearName: activeYear ? activeYear.name : '',
                ptaPositionId: null,
                ptaPositionName: '',
                name: '',
                phoneNumber: '',
                email: '',
                address: '',
                startDate: today,
                endDate: today,
                tenantId: null
            };

            // update dropdown UI
            const ayDd = $("#academicYearId").data("ejDropDownList");
            if (ayDd && activeYear) {
                ayDd.option("value", activeYear.id);
            }

            $("#ptaPositionId").ejDropDownList("option", "value", "");
        },
        


        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                timeOut: 10000
            };

            switch (type) {
                case 'error': toastr.error('', message); break;
                case 'warning': toastr.warning('', message); break;
                default: toastr.success('', message); break;
            }
        }
    }
});
app.mount('#app');