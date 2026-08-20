USE master;
GO
IF DB_ID(N'ParqueErickBarrondo') IS NULL
BEGIN
    CREATE DATABASE [ParqueErickBarrondo];
END
GO
