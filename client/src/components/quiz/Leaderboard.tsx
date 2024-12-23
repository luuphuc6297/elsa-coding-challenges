import { LeaderboardEntry } from '@/types'
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material'

interface Props {
    entries: LeaderboardEntry[]
}

export function Leaderboard({ entries }: Props) {
    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                Final Leaderboard
            </Typography>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Rank</TableCell>
                            <TableCell>Player</TableCell>
                            <TableCell align="right">Score</TableCell>
                            <TableCell align="right">Correct Answers</TableCell>
                            <TableCell align="right">Time Spent</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {entries.map((entry, index) => (
                            <TableRow key={entry.userId}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{entry.username}</TableCell>
                                <TableCell align="right">{entry.score}</TableCell>
                                <TableCell align="right">{entry.correctAnswers}</TableCell>
                                <TableCell align="right">
                                    {Math.round(entry.timeSpent / 1000)}s
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    )
}
