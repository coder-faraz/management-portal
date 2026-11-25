/* eslint-disable react-hooks/rules-of-hooks */
/**
 * Copyright © 2023, School CRM Inc. ALL RIGHTS RESERVED.
 *
 * This software is the confidential information of School CRM Inc., and is licensed as
 * restricted rights software. The use, reproduction, or disclosure of this software is subject to
 * restrictions set forth in your license agreement with School CRM.
 */

import { useNavigate } from "@/lib/routerAdapter";
import { useSelector } from "react-redux";
import { Eye, Pencil, Building2 } from 'lucide-react';
import { Utility } from "../utility";

export const datagridColumns = (setOpen = null, setSelectedId = null, customNavigate = null) => {

    const { capitalizeEveryWord } = Utility();
    const selected = useSelector(state => state.menuItems.selected);
    const routerNavigate = useNavigate();
    const navigateTo = customNavigate || routerNavigate;

    const handleActionEdit = (id) => {
        if (navigateTo) {
            navigateTo(`/${(selected || 'school').toLowerCase()}/update/${id}`, { state: { id: id } });
        }
    };

    const handleActionShow = (id) => {
        if (setSelectedId) setSelectedId(id);
        if (setOpen) setOpen(true);
    };

    const columns = [
        {
            field: "city",
            headerName: "City",
            headerAlign: "center",
            align: "center",
            flex: 1,
            minWidth: 140,
            renderCell: ({ row }) => {
                const cityName = row?.city;
                if (!cityName || cityName === '/') return <span className="text-slate-400 dark:text-slate-500 font-medium text-xs">-</span>;
                return (
                    <div className="flex justify-center items-center w-full h-full">
                        <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                            {capitalizeEveryWord(cityName)}
                        </span>
                    </div>
                );
            }
        },
        {
            field: "name",
            headerName: "School Name",
            headerAlign: "center",
            align: "center",
            flex: 1.4,
            minWidth: 180,
            renderCell: ({ row }) => {
                return (
                    <div className="flex items-center gap-2.5 justify-center w-full h-full">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/50">
                            <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-left truncate max-w-[170px]">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate" title={row.name}>
                                {capitalizeEveryWord(row.name)}
                            </div>
                            {row.school_code && (
                                <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500">
                                    #{row.school_code}
                                </span>
                            )}
                        </div>
                    </div>
                );
            }
        },
        {
            field: "board",
            headerName: "Board",
            headerAlign: "center",
            align: "center",
            flex: 1,
            minWidth: 120,
            renderCell: ({ row }) => (
                <div className="flex justify-center items-center w-full h-full">
                    <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                        {row?.board || '-'}
                    </span>
                </div>
            )
        },
        {
            field: "sub_type",
            headerName: "Sub Type",
            headerAlign: "center",
            align: "center",
            flex: 1,
            minWidth: 130,
            valueGetter: (value, row) => capitalizeEveryWord(row?.sub_type?.replace(/_/g, ' ')) || '-'
        },
        {
            field: "contact_no_1",
            headerName: "Contact Number",
            headerAlign: "center",
            align: "center",
            flex: 1.1,
            minWidth: 140,
            renderCell: ({ row }) => (
                <div className="flex justify-center items-center w-full h-full">
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                        {row?.contact_no_1 || '-'}
                    </span>
                </div>
            )
        },
        {
            field: "status",
            headerName: "Status",
            headerAlign: "center",
            align: "center",
            flex: 1,
            minWidth: 120,
            renderCell: ({ row: { status } }) => {
                const isActive = status === "active";
                return (
                    <div className="flex justify-center items-center w-full h-full">
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            isActive 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30' 
                            : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30'
                        }`}>
                            {capitalizeEveryWord(status) || 'Active'}
                        </div>
                    </div>
                );
            },
        },
        {
            field: "action",
            headerName: "Action",
            headerAlign: "center",
            align: "center",
            flex: 0.9,
            minWidth: 100,
            renderCell: ({ row: { id } }) => {
                return (
                    <div className="flex justify-center items-center gap-1.5 w-full h-full">
                        <button
                            onClick={() => handleActionEdit(id)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                            title="Edit School"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => handleActionShow(id)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:hover:bg-slate-500/20 dark:text-slate-400 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500/50 cursor-pointer"
                            title="View School Dossier"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    </div>
                );
            },
        }
    ];
    return columns;
};
