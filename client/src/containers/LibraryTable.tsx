'use client';

import * as React from 'react';
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    ChevronDown,
    Code,
    Code2Icon,
    Eye,
    Loader2,
    MoreHorizontal,
    Pen,
    PenBoxIcon,
    TextCursorIcon,
    Trash2Icon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUser } from '@/lib/UserProvider';
import { CodeTemplate, BlogPost, CreateResourceState } from '@/utils/types';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { generateEmptyStringObject } from '@/utils/common';
import TagsSelector from '@/components/tags-selector';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBlogPosts } from '@/lib/PostsProvider';
import { useCodeTemplates } from '@/lib/TemplatesProvider';
import { useToast } from '@/hooks/use-toast';

export const columns: ColumnDef<BlogPost | CodeTemplate>[] = [
    {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
            <div className=''>
                <Tooltip>
                    <TooltipTrigger
                        className={`p-2 rounded-md ${
                            row.getValue('type') === 'Blog Post' ? 'bg-emerald-700' : 'bg-sky-600'
                        }`}
                    >
                        {row.getValue('type') === 'Blog Post' ? (
                            <TextCursorIcon className='text-white dark:text-slate-900' size={16} />
                        ) : (
                            <Code2Icon className='text-white dark:text-slate-900' size={16} />
                        )}
                    </TooltipTrigger>
                    <TooltipContent side='bottom'>{row.getValue('type')}</TooltipContent>
                </Tooltip>
            </div>
        ),
    },
    {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
            <div
                className='hover:underline hover:underline-offset-4 hover:cursor-pointer'
                onClick={() => window.open('/app/templates/' + row.original.id)}
            >
                {row.getValue('title')}
            </div>
        ),
    },
    {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => <div>{row.getValue('description')}</div>,
    },
    {
        accessorKey: 'tags',
        header: () => <div>Tags</div>,
        cell: ({ row }) => {
            const templateID = row.original.id;
            const tags = row.original.tags;
            return (
                <div className='text-right font-medium flex flex-row gap-2 items-center'>
                    {tags.slice(0, 2).map((tag) => (
                        <Badge
                            className={
                                row.getValue('type') === 'Blog Post'
                                    ? 'font-normal hover:bg-emerald-700 bg-emerald-700'
                                    : 'font-normal hover:bg-sky-700 bg-sky-700'
                            }
                            key={templateID + tag.id}
                        >
                            {tag.name}
                        </Badge>
                    ))}
                    <HoverCard>
                        <HoverCardTrigger>{tags.length > 2 && ` +${tags.length - 2}`}</HoverCardTrigger>
                        <HoverCardContent className='rounded-lg flex flex-row w-fit gap-2 items-center justify-center max-w-[300px] h-fit flex-wrap'>
                            {tags.map((tag) => (
                                <Badge
                                    className={
                                        row.getValue('type') === 'Blog Post'
                                            ? 'font-normal w-fit hover:bg-emerald-700 bg-emerald-700'
                                            : 'font-normal w-fit hover:bg-sky-700 bg-sky-700'
                                    }
                                    key={templateID + tag.id}
                                >
                                    {tag.name}
                                </Badge>
                            ))}
                        </HoverCardContent>
                    </HoverCard>
                </div>
            );
        },
    },
    {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
            const resource = row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant='ghost' className='h-8 w-8 p-0 hover:bg-cyan-700'>
                            <span className='sr-only'>Open menu</span>
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            className='hover:!bg-cyan-700 hover:pointer'
                            onClick={() => window.open('/app/templates/' + resource.id)}
                        >
                            <Eye />
                            Open preview
                        </DropdownMenuItem>
                        <DropdownMenuItem className='hover:!bg-cyan-700 hover:pointer'>
                            <PenBoxIcon />
                            Edit metadata
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className='hover:!bg-red-700 hover:pointer'>
                            <Trash2Icon />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];

const initialState = generateEmptyStringObject(['title', 'description', 'language']) as {
    title: string;
    description: string;
    language: string;
};

export function LibraryTable() {
    const [dialogState, setDialogState] = React.useState<{ open: boolean; type: 'Code Template' | 'Blog Post' | null }>(
        {
            open: false,
            type: null,
        },
    );
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const { user, isLoading: usersLoading, getUserByID } = useUser();
    const { isLoading: postsLoading, createBlogPost } = useBlogPosts();
    const { isLoading: templatesLoading, createCodeTemplate } = useCodeTemplates();
    const { toast } = useToast();

    const [pageIndex, setPageIndex] = React.useState(0);
    const [pageSize, setPageSize] = React.useState(5);
    const [createResourceFormState, setCreateResourceFormState] = React.useState<CreateResourceState>({
        ...initialState,
        tags: [],
    });

    const table = useReactTable({
        data: user ? user.resources : [],
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            pagination: {
                pageSize: pageSize,
                pageIndex: pageIndex,
            },
        },
    });

    const handleCreateResourceFormSubmit = async () => {
        try {
            if (dialogState.type === 'Blog Post') {
                await createBlogPost(createResourceFormState);
            } else {
                await createCodeTemplate(createResourceFormState);
            }
            await getUserByID(user!.id);
            toast({
                title: 'Created resource!',
                description: 'Your ' + dialogState.type!.toLowerCase() + ' has been created'!,
            });
        } catch (error) {
            console.log(error);
            toast({
                title: 'Unable to create resource',
                description: 'Something went wrong. Please try again later.',
                variant: 'destructive',
            });
        } finally {
            setDialogState({ ...dialogState, open: false });
        }
    };

    return (
        <div className='w-full'>
            <Dialog
                open={dialogState.open}
                onOpenChange={(isOpen) => {
                    setCreateResourceFormState({ ...initialState, tags: [] });
                    setDialogState({ ...dialogState, open: isOpen });
                }}
            >
                <DialogContent className='max-w-[600px] sm:max-w-[425px]'>
                    <DialogHeader>
                        <DialogTitle>New {dialogState.type}</DialogTitle>
                        <DialogDescription>
                            Enter the metadata to create a new {dialogState.type?.toLowerCase()}.
                        </DialogDescription>
                        <Separator className='!mt-4' />
                    </DialogHeader>
                    <form onSubmit={(e) => e.preventDefault()}>
                        <div className='grid gap-4 !mt-2'>
                            <div className='grid gap-2'>
                                <Label htmlFor='title'>Title</Label>
                                <Input
                                    id='title'
                                    type='title'
                                    placeholder={'My Amazing ' + dialogState.type}
                                    required
                                    value={createResourceFormState.title}
                                    disabled={usersLoading || postsLoading || templatesLoading}
                                    onChange={(e) =>
                                        setCreateResourceFormState({
                                            ...createResourceFormState,
                                            title: e.target.value,
                                        })
                                    }
                                    className='focus:!ring-cyan-600'
                                />
                            </div>
                            <div className='grid gap-2'>
                                <div className='flex items-center'>
                                    <Label htmlFor='description'>Description</Label>
                                </div>
                                <Input
                                    id='description'
                                    type='description'
                                    placeholder={'This is my amazing ' + dialogState.type + '!'}
                                    required
                                    value={createResourceFormState.description}
                                    disabled={usersLoading || postsLoading || templatesLoading}
                                    onChange={(e) =>
                                        setCreateResourceFormState({
                                            ...createResourceFormState,
                                            description: e.target.value,
                                        })
                                    }
                                    className='focus:!ring-cyan-600'
                                />
                            </div>
                            <div className='grid gap-2'>
                                <div className='flex items-center'>
                                    <Label htmlFor='tags'>Tags</Label>
                                </div>
                                <TagsSelector
                                    disabled={usersLoading || postsLoading || templatesLoading}
                                    onChange={(tags) =>
                                        setCreateResourceFormState({ ...createResourceFormState, tags })
                                    }
                                    className='focus:!ring-cyan-600'
                                />
                            </div>
                            {dialogState.type === 'Code Template' && (
                                <div className='grid gap-2'>
                                    <div className='flex items-center'>
                                        <Label htmlFor='tags'>Language</Label>
                                    </div>
                                    <Select
                                        onValueChange={(value) =>
                                            setCreateResourceFormState({ ...createResourceFormState, language: value })
                                        }
                                        disabled={usersLoading || postsLoading || templatesLoading}
                                    >
                                        <SelectTrigger className='w-full'>
                                            <SelectValue placeholder='Select language' />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup className='w-full'>
                                                <SelectItem value='C' className='w-full'>
                                                    <div className='flex flex-row w-full'>C</div>
                                                </SelectItem>
                                                <SelectItem value='C++'>C++</SelectItem>
                                                <SelectItem value='Java'>Java</SelectItem>
                                                <SelectItem value='Python'>Python</SelectItem>
                                                <SelectItem value='JavaScript'>JavaScript</SelectItem>
                                                <SelectItem value='Ruby'>Ruby</SelectItem>
                                                <SelectItem value='Go'>Go</SelectItem>
                                                <SelectItem value='PHP'>PHP</SelectItem>
                                                <SelectItem value='Swift'>Swift</SelectItem>
                                                <SelectItem value='Rust'>Rust</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </form>
                    <DialogFooter className='!mt-4'>
                        <Button
                            onClick={handleCreateResourceFormSubmit}
                            className='w-full bg-cyan-600 hover:bg-cyan-500'
                            type='submit'
                        >
                            {(usersLoading || postsLoading || templatesLoading) && <Loader2 className='animate-spin' />}
                            {usersLoading || postsLoading || templatesLoading ? 'Creating' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div className='flex items-center py-4'>
                <Input
                    placeholder='Filter emails...'
                    value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
                    onChange={(event) => table.getColumn('title')?.setFilterValue(event.target.value)}
                    className='max-w-sm focus:!ring-cyan-600'
                />
                <div className='w-fit flex items-center py-4 flex-row gap-2 ml-auto'>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant='default'
                                className='ml-auto bg-cyan-600 dark:text-slate-900 hover:bg-cyan-500 dark:hover:text-slate-900'
                            >
                                <ChevronDown /> New
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                            <DropdownMenuItem
                                onClick={() => setDialogState({ open: true, type: 'Code Template' })}
                                className='hover:!bg-cyan-600 dark:hover:text-slate-900 font-medium hover:pointer'
                            >
                                <Code /> Code Template
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setDialogState({ open: true, type: 'Blog Post' })}
                                className='hover:pointer hover:!bg-cyan-600 dark:hover:text-slate-900 font-medium'
                            >
                                <Pen /> Blog Post
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant='outline' className='hover:bg-cyan-600'>
                                {table.getState().pagination.pageSize} rows <ChevronDown />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                            {[5, 10, 15, 20, 25].map((size) => {
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={size}
                                        className='capitalize'
                                        checked={pageSize === size}
                                        onClick={() => setPageSize(size)}
                                    >
                                        {size}
                                    </DropdownMenuCheckboxItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant='outline' className='ml-auto hover:bg-cyan-600'>
                                Columns <ChevronDown />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className='capitalize'
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    );
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <div className='rounded-md border max-h-[500px] overflow-y-auto'>
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length && !usersLoading ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className='h-24 text-center'>
                                    {usersLoading ? (
                                        [1, 2, 3, 4, 5, 6].map((_) => (
                                            <Skeleton className='bg-slate-800 w-full h-10 mb-2' key={_} />
                                        ))
                                    ) : (
                                        <>No results</>
                                    )}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className='flex items-center justify-end space-x-2 py-4'>
                <div className='flex-1 text-sm text-muted-foreground'>
                    Rows {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                    {Math.min(
                        (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                        table.getRowCount(),
                    )}{' '}
                    of {table.getFilteredRowModel().rows.length} total rows.
                </div>
                <div className='space-x-2'>
                    <Button
                        variant='outline'
                        size='sm'
                        className='h-10'
                        onClick={() => {
                            setPageIndex(pageIndex - 1);
                            table.previousPage();
                        }}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant='outline'
                        size='sm'
                        className='h-10'
                        onClick={() => {
                            setPageIndex(pageIndex + 1);
                            table.nextPage();
                        }}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}