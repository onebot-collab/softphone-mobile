import React, { useContext, useEffect, useState } from 'react';
import Icon from 'react-native-vector-icons/Feather';

import api from '../../services/api';
import formatDateTime from '../../utils/formatDateTime';
import useDebounce from '../../hooks/useDebounce';
import useReferredState from '../../hooks/useReferredState';
import Phone from '../../utils/phone/';
import { socket } from '../../utils/monitorSocket';

import { store } from '../../store';
import { clearNotifications } from '../../actions/notificationsActions';

import Header from '../../components/Header';
import Failed from '../../components/Failed';

import {
  Container,
  Loading,
  LoadingText,
  Search,
  SearchContainer,
  ClearSearch,
  CallsList,
  CallContainer,
  CallerContainer,
  CallName,
  CallNumber,
  InfoContainer,
  TimeContainer,
  CallTimer,
} from './styles';

const status = {
  OUT: <Icon color="#007bff" size={12} name="phone-forwarded" />,
  ANSWER: <Icon color="#5cb85c" size={12} name="phone-incoming" />,
  NOANSWER: <Icon color="#d9534f" size={12} name="phone-missed" />,
};

const History = ({ navigation }) => {
  const { state, dispatch } = useContext(store);
  const [socketConnection, setSocketConnection] = useState(false);
  const [calls, callsRef, setCalls] = useReferredState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(2);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      dispatch(clearNotifications());
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      dispatch(clearNotifications());
    });

    if (!calls.length || !socketConnection) {
      loadLastCalls();
    }

    connectSocket();

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, state.user]);

  useEffect(() => {
    loadLastCalls();
  }, [debouncedSearchTerm]);

  const connectSocket = () => {
    if (socket && !socketConnection) {
      socket.on('historyCallReceived', data => {
        if (data.destCallerIdNum != state.user.peer) {
          return;
        }

        const {
          uniqueId: id,
          callerIdName: name,
          startTime,
          callerIdNum: phone,
          dialStatus,
        } = data;

        const status = dialStatus == 'CANCEL' ? 'NOANSWER' : dialStatus;

        setCalls(
          [{ id, name, startTime, phone, status }, ...callsRef.current].sort((a, b) =>
            a.startTime > b.startTime ? -1 : 1,
          ),
        );
      });

      socket.on('historyCallOut', data => {
        if (data.callerIdNum != state.user.peer) {
          return;
        }

        const { uniqueId: id, callerIdName: name, startTime, callerIdNum: phone } = data;

        const status = 'OUT';

        setCalls(
          [{ id, name, startTime, phone, status }, ...callsRef.current].sort((a, b) =>
            a.startTime > b.startTime ? -1 : 1,
          ),
        );
      });

      setSocketConnection(true);
    }
  };

  const loadLastCalls = async () => {
    if (!state.user?.server) {
      return;
    }

    setLoading(true);

    const { data } = await api.post(`https://${state.user.server}/api/token`, {
      username: state.user.user,
      password: state.user.pass,
    });

    api.defaults.headers['Authorization'] = `Bearer ${data.token}`;

    const { data: newCalls } = await api.get(`https://${state.user.server}/api/historyCalls`, {
      params: {
        peerId: data.user.Peer.id,
        limit: 50,
        $or: {
          name: [{ $like: `%${debouncedSearchTerm}%` }],
          phone: [{ $like: `%${debouncedSearchTerm}%` }],
        },
      },
    });

    setCalls(newCalls);
    setLoading(false);
  };

  const loadHistory = async (pageIndex, calls) => {
    if (debouncedSearchTerm || !state.user.server) {
      return;
    }

    const { data } = await api.post(`https://${state.user.server}/api/token`, {
      username: state.user.user,
      password: state.user.pass,
    });

    api.defaults.headers['Authorization'] = `Bearer ${data.token}`;

    const { data: newCalls } = await api.get(`https://${state.user.server}/api/historyCalls`, {
      params: {
        peerId: data.user.Peer.id,
        page: pageIndex || page,
        limit: 50,
        $or: {
          name: [{ $like: `%${debouncedSearchTerm}%` }],
          phone: [{ $like: `%${debouncedSearchTerm}%` }],
        },
      },
    });

    setPage(page + 1);
    setCalls([...callsRef.current, ...newCalls]);
  };

  const handleHistorySelect = ({ phone }) => {
    Phone.makeCall(phone, state.user.server);
  };

  return (
    <>
      <Header />
      <Container>
        {!state.user?.server ? (
          <Failed navigation={navigation} />
        ) : loading ? (
          <Loading>
            <Icon name="loader" size={24} color="#aaa" />
            <LoadingText>Carregando histórico...</LoadingText>
          </Loading>
        ) : (
          <>
            <SearchContainer>
              <Search
                placeholder="Pesquisar histórico"
                value={searchTerm}
                onChangeText={value => setSearchTerm(value)}
              />
              <ClearSearch>
                <Icon name="x" size={24} color="#666" onPress={() => setSearchTerm('')} />
              </ClearSearch>
            </SearchContainer>

            <CallsList
              data={calls}
              keyExtractor={call => call.id.toString()}
              onEndReached={() => loadHistory(page, calls)}
              onEndReachedThreshold={0.2}
              renderItem={({ item: call }) => (
                <CallContainer
                  key={call.id}
                  onPress={() => handleHistorySelect(call)}
                  delayLongPress={500}>
                  <InfoContainer>
                    <TimeContainer>
                      <Icon name="clock" size={12} />
                      <CallTimer>{formatDateTime(new Date(call.startTime))}</CallTimer>
                    </TimeContainer>
                    {status[call.status]}
                  </InfoContainer>

                  <CallerContainer>
                    <CallNumber>{call.phone}</CallNumber>
                    <CallName>{` <${call.name}>`}</CallName>
                  </CallerContainer>
                </CallContainer>
              )}
            />
          </>
        )}
      </Container>
    </>
  );
};

export default History;
